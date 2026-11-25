import { eq, and, sql, desc } from "drizzle-orm";
import { db } from "../../../db/index.ts";
import { contractFolder, csmsAiEvaluationJob } from "../../../db/schema/csms.schema.ts";
import env from "../../../config/env.config.ts";

/**
 * Check if folder exists and is complete (all documents uploaded)
 */
export async function getFolderForEvaluation(folderId: string) {
  const folder = await db.query.contractFolder.findFirst({
    where: eq(contractFolder.id, folderId),
  });
  return folder ?? null;
}

/**
 * Check if there's already an active (queued/processing) job for this folder
 */
// Jobs older than the stale window can never finish (crashed/offline engine): close them
// so the folder is not locked behind HTTP 409 forever.
async function closeStaleJobs(folderId: string) {
  const staleMinutes = Number(process.env.CSMS_AI_JOB_STALE_MINUTES ?? 120);
  await db
    .update(csmsAiEvaluationJob)
    .set({ status: "failed", errorMessage: "Job timed out (no result from CSMS-AI engine)", completedAt: new Date() })
    .where(
      and(
        eq(csmsAiEvaluationJob.contractFolderId, folderId),
        sql`${csmsAiEvaluationJob.status} IN ('queued', 'processing')`,
        sql`${csmsAiEvaluationJob.createdAt} < now() - (${staleMinutes} * interval '1 minute')`
      )
    );
}

export async function hasActiveJob(folderId: string): Promise<boolean> {
  await closeStaleJobs(folderId);
  const [activeJob] = await db
    .select({ id: csmsAiEvaluationJob.id })
    .from(csmsAiEvaluationJob)
    .where(
      and(
        eq(csmsAiEvaluationJob.contractFolderId, folderId),
        sql`${csmsAiEvaluationJob.status} IN ('queued', 'processing')`
      )
    )
    .limit(1);
  return !!activeJob;
}

/**
 * Create evaluation job and trigger Python FastAPI service
 * Returns { jobId, status }
 */
export async function createEvaluationJob(
  folderId: string,
  userId: string,
  targetFolderIds: string[] | null = null,
  mode: "fast" | "thorough" = "thorough",
  trial?: { rubricVersionId: string }
): Promise<{ jobId: string; status: string }> {
  const serviceUrl = env.csmsAi.serviceUrl;

  // 1. Health check - ensures the Python engine is running
  try {
    const healthCheck = await fetch(`${serviceUrl}/health`, { method: "GET", signal: AbortSignal.timeout(5000) });
    if (!healthCheck.ok) {
      throw new Error(`CSMS-AI Engine returned status ${healthCheck.status}`);
    }
  } catch (error: any) {
    console.error(`[CSMS-AI] Health check failed:`, error.message);
    throw new Error("CSMS-AI Engine is offline or unreachable");
  }

  // 2. Insert job (status: queued)
  const [job] = await db
    .insert(csmsAiEvaluationJob)
    .values({
      contractFolderId: folderId,
      userId: userId,
      status: "queued",
      progressMessage: "Job created, waiting for processing",
      targetFolderIds: targetFolderIds && targetFolderIds.length ? targetFolderIds : null,
      mode,
      ...(trial ? { trial: true, rubricVersionId: trial.rubricVersionId } : {}),
    })
    .returning({ id: csmsAiEvaluationJob.id });

  const jobId = job.id;

  // 3. Fire-and-forget: trigger Python FastAPI. If it cannot start the job, mark it failed
  //    right away (otherwise it would stay 'queued' and lock the folder).
  const markFailed = async (message: string) => {
    await db
      .update(csmsAiEvaluationJob)
      .set({ status: "failed", errorMessage: message, completedAt: new Date() })
      .where(eq(csmsAiEvaluationJob.id, jobId))
      .catch((e) => console.error("[CSMS-AI] Failed to mark job failed:", e));
  };
  fetch(`${serviceUrl}/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId }),
    // without a timeout a hung engine leaves the job 'queued' forever
    signal: AbortSignal.timeout(15000),
  })
    .then(async (res) => {
      if (!res.ok) {
        console.error(`[CSMS-AI] FastAPI responded ${res.status}`);
        // 409 = engine already runs this job (duplicate trigger): do not fail a healthy job.
        if (res.status !== 409) await markFailed(`CSMS-AI engine rejected the job (HTTP ${res.status})`);
      } else {
        console.log(`[CSMS-AI] Triggered evaluation for job ${jobId}`);
      }
    })
    .catch(async (err) => {
      console.error(`[CSMS-AI] Failed to reach FastAPI:`, err.message);
      await markFailed(`Failed to reach CSMS-AI engine: ${err.message}`);
    });

  return { jobId, status: "queued" };
}

/**
 * Get job status (for polling fallback)
 */
export async function getJobStatus(jobId: string) {
  const [job] = await db
    .select({
      id: csmsAiEvaluationJob.id,
      contractFolderId: csmsAiEvaluationJob.contractFolderId,
      status: csmsAiEvaluationJob.status,
      progressMessage: csmsAiEvaluationJob.progressMessage,
      errorMessage: csmsAiEvaluationJob.errorMessage,
      jurorScores: csmsAiEvaluationJob.jurorScores,
      modelUsed: csmsAiEvaluationJob.modelUsed,
      targetFolderIds: csmsAiEvaluationJob.targetFolderIds,
      mode: csmsAiEvaluationJob.mode,
      startedAt: csmsAiEvaluationJob.startedAt,
      completedAt: csmsAiEvaluationJob.completedAt,
      createdAt: csmsAiEvaluationJob.createdAt,
    })
    .from(csmsAiEvaluationJob)
    .where(eq(csmsAiEvaluationJob.id, jobId))
    .limit(1);

  return job ? { ...job, queuePosition: await getQueuePosition(job) } : null;
}

/**
 * 1-based position among active jobs (the engine runs them one by one in creation order); 0 when running/finished.
 */
async function getQueuePosition(job: { status: string; createdAt: Date }): Promise<number> {
  if (job.status !== "queued") return 0;
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(csmsAiEvaluationJob)
    .where(
      and(
        sql`${csmsAiEvaluationJob.status} IN ('queued', 'processing')`,
        sql`${csmsAiEvaluationJob.createdAt} < ${job.createdAt}`
      )
    );
  return (row?.n ?? 0) + 1;
}

/**
 * Get active job for a folder
 */
export async function getActiveJobForFolder(folderId: string) {
  await closeStaleJobs(folderId);
  const [job] = await db
    .select({
      id: csmsAiEvaluationJob.id,
      contractFolderId: csmsAiEvaluationJob.contractFolderId,
      status: csmsAiEvaluationJob.status,
      progressMessage: csmsAiEvaluationJob.progressMessage,
      targetFolderIds: csmsAiEvaluationJob.targetFolderIds,
      mode: csmsAiEvaluationJob.mode,
      startedAt: csmsAiEvaluationJob.startedAt,
      createdAt: csmsAiEvaluationJob.createdAt,
    })
    .from(csmsAiEvaluationJob)
    .where(
      and(
        eq(csmsAiEvaluationJob.contractFolderId, folderId),
        sql`${csmsAiEvaluationJob.status} IN ('queued', 'processing')`
      )
    )
    .orderBy(desc(csmsAiEvaluationJob.createdAt))
    .limit(1);

  return job ? { ...job, queuePosition: await getQueuePosition(job) } : null;
}

/**
 * Cancel a queued/processing job. The engine skips a cancelled queued job and stops a running one
 * before its next element. Returns false when the job was not active anymore.
 */
export async function cancelEvaluationJob(jobId: string): Promise<boolean> {
  const rows = await db
    .update(csmsAiEvaluationJob)
    .set({ status: "failed", errorMessage: "Dibatalkan oleh pengguna", completedAt: new Date() })
    .where(and(eq(csmsAiEvaluationJob.id, jobId), sql`${csmsAiEvaluationJob.status} IN ('queued', 'processing')`))
    .returning({ id: csmsAiEvaluationJob.id });
  return rows.length > 0;
}

/**
 * Is the CSMS-AI engine reachable? Used by the UI health badge.
 */
export async function getEngineHealth(): Promise<{ online: boolean; latencyMs: number | null; vision: boolean | null }> {
  const t0 = Date.now();
  try {
    const res = await fetch(`${env.csmsAi.serviceUrl}/health`, { signal: AbortSignal.timeout(5000) });
    const body: any = res.ok ? await res.json().catch(() => ({})) : {};
    // vision = OCR model (qwen3-vl); false means scanned pages are read with the PaddleOCR fallback
    return { online: res.ok, latencyMs: res.ok ? Date.now() - t0 : null, vision: typeof body.vision === "boolean" ? body.vision : null };
  } catch {
    return { online: false, latencyMs: null, vision: null };
  }
}

/**
 * Granular evaluation target: the assessment (root, depth 0) folder that owns `folderId`, and whether
 * the subtree of `folderId` holds at least one file. Jobs always run on the root (one lock per
 * assessment folder); the element/group goes into target_folder_ids.
 */
export async function resolveGranularTarget(folderId: string) {
  const res = await db.execute(sql`
    SELECT r.id AS "rootId", f.depth AS "depth",
           (SELECT count(*)::int FROM csms_contract_folder x WHERE x.file_type = 'file' AND x.path <@ f.path) AS "files"
      FROM csms_contract_folder f
      JOIN csms_contract_folder r
        ON r.contract_id = f.contract_id AND r.depth = 0 AND f.path <@ r.path
     WHERE f.id = ${folderId} AND f.file_type = 'folder'
     LIMIT 1`);
  const row = ((res as any).rows ?? res)[0] as { rootId: string; depth: number; files: number } | undefined;
  return row ?? null;
}

/**
 * Elements of an assessment folder whose last AI run could not score them
 * ("AI tidak tersedia" / "AI tidak dapat menilai ...").
 */
export async function getFailedElementIds(rootId: string): Promise<string[]> {
  const res = await db.execute(sql`
    SELECT f.id FROM csms_contract_folder f
      JOIN csms_contract_folder r ON r.id = ${rootId} AND f.contract_id = r.contract_id AND f.path <@ r.path
     WHERE f.file_type = 'folder' AND f.ai_reasoning LIKE 'AI tidak %'`);
  return (((res as any).rows ?? res) as { id: string }[]).map((r) => r.id);
}
