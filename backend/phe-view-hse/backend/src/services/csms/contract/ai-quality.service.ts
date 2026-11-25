import { sql } from "drizzle-orm";
import { db } from "../../../db/index.ts";
import env from "../../../config/env.config.ts";

/**
 * Evaluator corrections, AI quality and the AI rubric (kriteria penilaian Excel).
 * Tables: csms_ai_feedback, csms_ai_rubric_version, csms_ai_rubric_item (see db/ensure/06-csms.ts).
 */

const rows = <T>(res: any): T[] => ((res as any).rows ?? res) as T[];

export const RUBRIC_COLUMNS = [
  "no", "element_category", "element", "required_document", "document_format", "evaluation_criteria",
  "mandatory_fields", "score_0", "score_3", "score_6", "score_10", "status_accept", "status_reject",
  "status_revision", "validation_method", "ai_checkpoint_keywords", "document_expiry_check",
  "ai_confidence_threshold", "ai_reasoning_hint", "notes",
] as const;
const TEXT_COLUMNS = RUBRIC_COLUMNS.slice(1);

/** "6.5 Laporan ..." -> "6.5"; elements 1 and 2 have no sub-number ("1 Kepemimpinan ...") */
export const elementCodeOf = (name: string) => name.match(/^(\d+(?:\.\d+)*)\s/)?.[1] ?? null;

// ---------------------------------------------------------------------------
// Evaluator corrections
// ---------------------------------------------------------------------------

/**
 * Saves why the evaluator's score differs from the AI score. Only for AI-scored elements and only when the
 * scores differ; the engine shows the last corrections of an element to its jurors (few-shot).
 */
export async function saveAiFeedback(folderId: string, evaluatorScore: number, reason: string, userId?: string) {
  const text = reason.trim();
  if (!text) return false;
  const f = rows<{ name: string; aiScore: string | null; processed: string | null }>(await db.execute(sql`
    SELECT name, ai_score::text AS "aiScore", ai_processed_at::text AS processed
      FROM csms_contract_folder WHERE id = ${folderId}`))[0];
  const code = f && elementCodeOf(f.name);
  if (!f || !code || !f.processed || Number(f.aiScore) === Number(evaluatorScore)) return false;
  await db.execute(sql`
    INSERT INTO csms_ai_feedback (folder_id, element_code, ai_score, evaluator_score, reason, user_id)
    VALUES (${folderId}, ${code}, ${f.aiScore}, ${evaluatorScore}, ${text.slice(0, 4000)}, ${userId ?? null})`);
  return true;
}

// ---------------------------------------------------------------------------
// AI quality: agreement between AI score and the evaluator's score
// ---------------------------------------------------------------------------

const LEVELS = [-1, 0, 3, 6, 10];
const level = (s: number) => {
  // nearest rubric level (AI scores are averages of jurors and may be e.g. 4.5)
  let best = 0;
  LEVELS.forEach((l, i) => { if (Math.abs(l - s) < Math.abs(LEVELS[best] - s)) best = i; });
  return best;
};

export async function getAiQuality(contractId?: string) {
  const pairs = rows<{ code: string | null; name: string; ai: string; score: string }>(await db.execute(sql`
    SELECT f.name, f.ai_score::text AS ai, f.score::text AS score
      FROM csms_contract_folder f
     WHERE f.file_type = 'folder' AND f.ai_processed_at IS NOT NULL AND f.status <> 'pending'
       AND f.ai_reasoning LIKE 'HASIL PENILAIAN AI%'
       ${contractId ? sql`AND f.contract_id = ${contractId}` : sql``}`));

  const per = new Map<string, { code: string; element: string; n: number; exact: number; near: number; diff: number }>();
  let n = 0, exact = 0, near = 0;
  for (const p of pairs) {
    const code = elementCodeOf(p.name);
    if (!code) continue;
    const d = Math.abs(level(Number(p.ai)) - level(Number(p.score)));
    const e = per.get(code) ?? { code, element: p.name.replace(/^\S+\s+/, ""), n: 0, exact: 0, near: 0, diff: 0 };
    e.n++; n++;
    if (d === 0) { e.exact++; exact++; }
    if (d <= 1) { e.near++; near++; }
    e.diff += Number(p.ai) - Number(p.score);
    per.set(code, e);
  }
  const byCode = (a: string, b: string) => {
    const x = a.split(".").map(Number), y = b.split(".").map(Number);
    return x[0] - y[0] || (x[1] ?? 0) - (y[1] ?? 0);
  };
  const elements = [...per.values()].sort((a, b) => byCode(a.code, b.code)).map((e) => ({
    code: e.code, element: e.element, count: e.n,
    exactPct: Math.round((100 * e.exact) / e.n), nearPct: Math.round((100 * e.near) / e.n),
    avgDiff: Math.round((10 * e.diff) / e.n) / 10, // >0: AI scores higher than the evaluator
  }));

  const corrections = rows<any>(await db.execute(sql`
    SELECT fb.id, fb.element_code AS "elementCode", fb.ai_score::float AS "aiScore", fb.evaluator_score::float AS "evaluatorScore",
           fb.reason, fb.created_at AS "createdAt", u.name AS "userName", c.title AS "contractTitle",
           coalesce(fb.source, 'evaluator') AS source
      FROM csms_ai_feedback fb
      JOIN csms_contract_folder f ON f.id = fb.folder_id
      JOIN csms_contract c ON c.id = f.contract_id
      LEFT JOIN users u ON u.id = fb.user_id
     ${contractId ? sql`WHERE f.contract_id = ${contractId}` : sql``}
     ORDER BY fb.created_at DESC LIMIT 20`));

  return {
    total: n,
    exactPct: n ? Math.round((100 * exact) / n) : 0,
    nearPct: n ? Math.round((100 * near) / n) : 0,
    elements,
    corrections,
  };
}

// ---------------------------------------------------------------------------
// Elements changed since the AI run / still waiting for the evaluator (fast-mode priority)
// ---------------------------------------------------------------------------

/** Element folders of an assessment folder with a file uploaded after their last AI run. */
export async function getChangedSinceAi(rootId: string): Promise<string[]> {
  return rows<{ id: string }>(await db.execute(sql`
    SELECT f.id FROM csms_contract_folder f
      JOIN csms_contract_folder r ON r.id = ${rootId} AND f.contract_id = r.contract_id AND f.path <@ r.path
     WHERE f.file_type = 'folder' AND f.ai_processed_at IS NOT NULL
       AND EXISTS (SELECT 1 FROM csms_contract_folder x
                    WHERE x.file_type = 'file' AND x.path <@ f.path AND x.created_at > f.ai_processed_at)`)).map((r) => r.id);
}

/**
 * Priority targets: elements with files whose evaluator score is not final yet (status pending) or whose
 * files changed since the AI run. Elements already assessed by the evaluator and unchanged are skipped.
 */
export async function getPriorityElementIds(rootId: string): Promise<string[]> {
  return rows<{ id: string; name: string }>(await db.execute(sql`
    SELECT f.id, f.name FROM csms_contract_folder f
      JOIN csms_contract_folder r ON r.id = ${rootId} AND f.contract_id = r.contract_id AND f.path <@ r.path
     WHERE f.file_type = 'folder' AND f.depth > r.depth
       AND EXISTS (SELECT 1 FROM csms_contract_folder x WHERE x.file_type = 'file' AND x.parent_id = f.id)
       AND (f.status = 'pending' OR f.ai_processed_at IS NULL
            OR EXISTS (SELECT 1 FROM csms_contract_folder x
                        WHERE x.file_type = 'file' AND x.path <@ f.path AND x.created_at > f.ai_processed_at))`))
    .filter((r) => elementCodeOf(r.name))
    .map((r) => r.id);
}

// ---------------------------------------------------------------------------
// Rubric
// ---------------------------------------------------------------------------

export async function listRubricVersions(rubricType = "marine") {
  return rows<any>(await db.execute(sql`
    SELECT v.id, v.version, v.label, v.source_filename AS "sourceFilename", v.is_active AS "isActive",
           v.created_at AS "createdAt", u.name AS "createdBy",
           (SELECT count(*)::int FROM csms_ai_rubric_item i WHERE i.version_id = v.id) AS items
      FROM csms_ai_rubric_version v LEFT JOIN users u ON u.id = v.created_by
     WHERE v.rubric_type = ${rubricType} ORDER BY v.version DESC`));
}

export async function getRubricItems(versionId?: string, rubricType = "marine") {
  const vid = versionId ?? rows<{ id: string }>(await db.execute(sql`
    SELECT id FROM csms_ai_rubric_version WHERE rubric_type = ${rubricType} AND is_active LIMIT 1`))[0]?.id;
  if (!vid) return { versionId: null, items: [] };
  const items = rows<any>(await db.execute(sql`
    SELECT ${sql.raw(RUBRIC_COLUMNS.join(", "))} FROM csms_ai_rubric_item WHERE version_id = ${vid}
     ORDER BY string_to_array(no, '.')::int[]`));
  return { versionId: vid, items };
}

/**
 * Manual edit of one element: copies the active version into a new version with the change and activates it,
 * so every AI result stays traceable to the rubric it was scored with.
 */
/** Deletes one correction (e.g. a synthetic calibration draft the admin does not agree with). */
export async function deleteAiFeedback(id: string) {
  return rows(await db.execute(sql`DELETE FROM csms_ai_feedback WHERE id = ${id} RETURNING id`)).length > 0;
}

export async function updateRubricItem(no: string, fields: Record<string, string>, userId?: string, rubricType = "marine") {
  const label = (fields.__label ?? "").trim().slice(0, 200);
  const changes = Object.fromEntries(Object.entries(fields).filter(([k]) => (TEXT_COLUMNS as readonly string[]).includes(k)));
  if (!Object.keys(changes).length) throw new Error("Tidak ada kolom rubrik yang diubah");
  return db.transaction(async (tx) => {
    const active = rows<{ id: string; version: number }>(await tx.execute(sql`
      SELECT id, version FROM csms_ai_rubric_version WHERE rubric_type = ${rubricType} AND is_active LIMIT 1`))[0];
    if (!active) throw new Error("Rubrik aktif tidak ditemukan");
    const exists = rows(await tx.execute(sql`SELECT 1 FROM csms_ai_rubric_item WHERE version_id = ${active.id} AND no = ${no}`));
    if (!exists.length) throw new Error(`Elemen ${no} tidak ada di rubrik`);
    const next = rows<{ id: string; version: number }>(await tx.execute(sql`
      INSERT INTO csms_ai_rubric_version (rubric_type, version, label, source_filename, is_active, created_by)
      SELECT ${rubricType}, coalesce(max(version), 0) + 1, ${label || `Edit elemen ${no}`}, NULL, FALSE, ${userId ?? null}
        FROM csms_ai_rubric_version WHERE rubric_type = ${rubricType}
      RETURNING id, version`))[0];
    const cols = sql.raw(RUBRIC_COLUMNS.join(", "));
    await tx.execute(sql`INSERT INTO csms_ai_rubric_item (version_id, ${cols})
      SELECT ${next.id}, ${cols} FROM csms_ai_rubric_item WHERE version_id = ${active.id}`);
    for (const [k, v] of Object.entries(changes)) {
      await tx.execute(sql`UPDATE csms_ai_rubric_item SET ${sql.raw(k)} = ${String(v ?? "")}, updated_at = now()
        WHERE version_id = ${next.id} AND no = ${no}`);
    }
    await tx.execute(sql`UPDATE csms_ai_rubric_version SET is_active = (id = ${next.id}) WHERE rubric_type = ${rubricType}`);
    return next;
  });
}

export async function activateRubricVersion(versionId: string, rubricType = "marine") {
  const ok = rows(await db.execute(sql`SELECT 1 FROM csms_ai_rubric_version WHERE id = ${versionId} AND rubric_type = ${rubricType}`));
  if (!ok.length) return false;
  await db.execute(sql`UPDATE csms_ai_rubric_version SET is_active = (id = ${versionId}) WHERE rubric_type = ${rubricType}`);
  return true;
}

/** Excel parsing lives in the engine (same parser that seeds the bundled file). */
export async function importRubricExcel(data: Buffer, filename: string, label: string, userId?: string) {
  const res = await fetch(`${env.csmsAi.serviceUrl}/rubric/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data_b64: data.toString("base64"), filename, label, created_by: userId ?? null }),
    signal: AbortSignal.timeout(60000),
  });
  const body: any = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body?.detail || `Impor gagal (${res.status})`), { statusCode: res.status === 400 ? 400 : 502 });
  return body as { id: string; version: number; items: number };
}

export async function exportRubricExcel(versionId?: string): Promise<Buffer> {
  const q = versionId ? `?version_id=${encodeURIComponent(versionId)}` : "";
  const res = await fetch(`${env.csmsAi.serviceUrl}/rubric/export${q}`, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw Object.assign(new Error(`Ekspor gagal (${res.status})`), { statusCode: res.status === 404 ? 404 : 502 });
  return Buffer.from(await res.arrayBuffer());
}

// ---------------------------------------------------------------------------
// P4: trial of a rubric version on reference folders (final assessments)
// ---------------------------------------------------------------------------

/** Final assessment folders that have evaluator scores: candidates for the reference set. */
export async function listReferenceFolders() {
  return rows<any>(await db.execute(sql`
    SELECT r.id, r.name, c.title AS "contractTitle",
           (SELECT count(*)::int FROM csms_contract_folder f WHERE f.path <@ r.path AND f.file_type = 'folder' AND f.status <> 'pending'
               AND f.name ~ '^([12] |[3-8]\.[0-9]+ )') AS assessed
      FROM csms_contract_folder r JOIN csms_contract c ON c.id = r.contract_id
     WHERE r.depth = 0 AND r.is_final AND r.is_complete
     ORDER BY r.updated_at DESC LIMIT 30`)).filter((r) => r.assessed > 0);
}

const agreement = (pairs: { ai: number; ev: number }[]) => {
  const lv = level; // nearest level index (-1, 0, 3, 6, 10)
  const n = pairs.length;
  const exact = pairs.filter((p) => lv(p.ai) === lv(p.ev)).length;
  const near = pairs.filter((p) => Math.abs(lv(p.ai) - lv(p.ev)) <= 1).length;
  return { n, exactPct: n ? Math.round((100 * exact) / n) : 0, nearPct: n ? Math.round((100 * near) / n) : 0 };
};

/** Trial jobs with their agreement, next to the AI results the same folders had before (baseline). */
export async function listRubricTrials() {
  const jobs = rows<any>(await db.execute(sql`
    SELECT j.id, j.status, j.mode, j.progress_message AS progress, j.created_at AS "createdAt", j.completed_at AS "completedAt",
           v.version, v.label, r.name AS "rootName"
      FROM csms_ai_evaluation_job j
      LEFT JOIN csms_ai_rubric_version v ON v.id = j.rubric_version_id
      JOIN csms_contract_folder r ON r.id = j.contract_folder_id
     WHERE j.trial ORDER BY j.created_at DESC LIMIT 20`));
  if (!jobs.length) return [];
  const results = rows<any>(await db.execute(sql`
    SELECT t.job_id AS job, t.ai_score::float AS ai, t.evaluator_score::float AS ev, t.confidence::float AS conf,
           s.ai_score::float AS before, (s.ai_reasoning LIKE 'HASIL PENILAIAN AI%') AS "beforeValid"
      FROM csms_ai_trial_result t
      LEFT JOIN csms_ai_trial_snapshot s ON s.job_id = t.job_id AND s.folder_id = t.folder_id
     WHERE t.job_id IN (${sql.join(jobs.map((j) => sql`${j.id}::uuid`), sql`, `)})
       AND t.evaluator_status <> 'pending' AND t.evaluator_score >= 0`));
  return jobs.map((j) => {
    const mine = results.filter((r) => r.job === j.id);
    return {
      ...j,
      trial: agreement(mine.map((r) => ({ ai: r.ai, ev: r.ev }))),
      baseline: agreement(mine.filter((r) => r.beforeValid).map((r) => ({ ai: r.before, ev: r.ev }))),
      lowConfidence: mine.filter((r) => r.conf != null && r.conf < 0.85).length,
    };
  });
}
