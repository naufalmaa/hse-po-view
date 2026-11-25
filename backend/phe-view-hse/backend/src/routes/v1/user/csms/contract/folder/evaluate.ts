import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { withErrorHandler } from "../../../../../../utils/withErrorHandler.ts";
import { Type } from "@sinclair/typebox";
import {
  getFolderForEvaluation,
  hasActiveJob,
  createEvaluationJob,
  getJobStatus,
  getActiveJobForFolder,
  cancelEvaluationJob,
  getEngineHealth,
  resolveGranularTarget,
  getFailedElementIds,
} from "../../../../../../services/csms/contract/ai-evaluation.service.ts";
import { getPriorityElementIds, getChangedSinceAi } from "../../../../../../services/csms/contract/ai-quality.service.ts";

const bodySchema = Type.Object({
  folderId: Type.String({ format: "uuid" }),
  // admin only: re-run just the elements the last run could not score
  retryFailed: Type.Optional(Type.Boolean()),
  // whole assessment folder, but only elements not yet final for the evaluator or with files changed since the AI run
  priorityOnly: Type.Optional(Type.Boolean()),
  // fast: important parts only, time-boxed; thorough: full documents + per-file summaries (default)
  mode: Type.Optional(Type.Union([Type.Literal("fast"), Type.Literal("thorough")])),
});

const querySchema = Type.Object({
  jobId: Type.String({ format: "uuid" }),
});

const errorSchema = Type.Object({
  success: Type.Optional(Type.Boolean()),
  message: Type.String(),
});

const folderQuerySchema = Type.Object({
  folderId: Type.String({ format: "uuid" }),
});

const aiEvaluationRoutes: FastifyPluginAsyncTypebox = async (app) => {
  // -------------------------------------------------------
  // POST /evaluate — trigger AI evaluation for a folder
  // -------------------------------------------------------
  app.route({
    url: "/evaluate",
    method: "POST",
    schema: {
      tags: ["CSMS AI Evaluation"],
      summary: "Trigger AI evaluation for a folder",
      description:
        "Creates a background evaluation job and triggers the Python CSMS-AI service. Returns 202 immediately.",
      body: bodySchema,
      response: {
        202: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({
            jobId: Type.String({ format: "uuid" }),
            status: Type.String(),
            folderId: Type.String({ format: "uuid" }),
            targetCount: Type.Number(),
          }),
        }),
        // `success` is optional: Fastify's own validation errors ({statusCode,error,message})
        // also go through this 4xx schema and used to fail serialization (=> HTTP 500).
        400: errorSchema,
        403: errorSchema,
        409: errorSchema,
        500: errorSchema,
        503: errorSchema,
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      const { folderId, retryFailed, priorityOnly, mode } = req.body as {
        folderId: string; retryFailed?: boolean; priorityOnly?: boolean; mode?: "fast" | "thorough";
      };
      const session = (req as any).session;
      const userId = session?.user?.id;

      if (!userId) {
        return reply.status(400).send({
          success: false,
          message: "User session not found",
        });
      }

      // AI scoring is an admin function (the admin is also the evaluator of the AI results)
      if (session?.user?.role !== "admin") {
        return reply.status(403).send({ success: false, message: "Hanya admin yang dapat menjalankan evaluasi AI" });
      }

      // 1. Validate folder exists
      const folder = await getFolderForEvaluation(folderId);
      if (!folder) {
        return reply.status(400).send({
          success: false,
          message: "Folder not found",
        });
      }

      // Granular run (an element/group inside an assessment folder) or "retry failed elements": admin only,
      // the job runs on the assessment (root) folder with target_folder_ids, so one lock covers both.
      let rootId = folderId;
      let targets: string[] | null = null;
      if ((folder.depth ?? 0) > 0 || retryFailed || priorityOnly) {
        const target = await resolveGranularTarget(folderId);
        if (!target) {
          return reply.status(400).send({ success: false, message: "Folder penilaian induk tidak ditemukan" });
        }
        rootId = target.rootId;
        if (retryFailed) {
          targets = await getFailedElementIds(rootId);
          if (!targets.length) {
            return reply.status(400).send({ success: false, message: "Tidak ada elemen gagal yang perlu diulang" });
          }
        } else if (priorityOnly) {
          targets = await getPriorityElementIds(rootId);
          if (!targets.length) {
            return reply.status(400).send({ success: false, message: "Semua elemen sudah dinilai evaluator dan tidak ada berkas baru" });
          }
        } else {
          if (target.files < 1) {
            return reply.status(400).send({ success: false, message: "Elemen ini belum memiliki berkas" });
          }
          targets = [folderId];
        }
      }

      // 2. Validate isComplete (full assessment folder run only; granular runs need >= 1 file)
      if (!targets && !folder.isComplete) {
        return reply.status(400).send({
          success: false,
          message:
            "Folder documents are not complete. Please upload all required documents before evaluation.",
        });
      }

      // 3. Check for active job (queued/processing)
      const activeJob = await hasActiveJob(rootId);
      if (activeJob) {
        return reply.status(409).send({
          success: false,
          message:
            "An evaluation is already in progress for this folder. Please wait for it to complete.",
        });
      }

      // 4. Create job + trigger FastAPI
      try {
        const { jobId, status } = await createEvaluationJob(rootId, userId, targets, mode ?? "thorough");

        return reply.status(202).send({
          success: true,
          message: "Evaluation job created and processing started",
          data: { jobId, status, folderId: rootId, targetCount: targets?.length ?? 0 },
        });
      } catch (error: any) {
        return reply.status(503).send({
          success: false,
          message: error.message || "CSMS-AI Engine is offline or unreachable",
        });
      }
    }),
  });

  // -------------------------------------------------------
  // GET /evaluate/status?jobId=xxx — check job status
  // -------------------------------------------------------
  app.route({
    url: "/evaluate/status",
    method: "GET",
    schema: {
      tags: ["CSMS AI Evaluation"],
      summary: "Check evaluation job status",
      description: "Returns current status and results of an evaluation job.",
      querystring: querySchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          data: Type.Any(),
        }),
        404: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      const { jobId } = req.query as { jobId: string };
      const job = await getJobStatus(jobId);

      if (!job) {
        return reply.status(404).send({
          success: false,
          message: "Job not found",
        });
      }

      return reply.status(200).send({
        success: true,
        data: job,
      });
    }),
  });

  // -------------------------------------------------------
  // GET /evaluate/active?folderId=xxx — check active job
  // -------------------------------------------------------
  app.route({
    url: "/evaluate/changed",
    method: "GET",
    schema: {
      tags: ["CSMS AI Evaluation"],
      summary: "Element folders with files uploaded after their last AI run",
      querystring: folderQuerySchema,
    },
    handler: withErrorHandler(async (req, reply) => {
      const { folderId } = req.query as { folderId: string };
      const target = await resolveGranularTarget(folderId);
      const ids = target ? await getChangedSinceAi(target.rootId) : [];
      const priority = target ? await getPriorityElementIds(target.rootId) : [];
      return reply.status(200).send({ success: true, data: { changedIds: ids, priorityCount: priority.length } });
    }),
  });

  app.route({
    url: "/evaluate/active",
    method: "GET",
    schema: {
      tags: ["CSMS AI Evaluation"],
      summary: "Get active job for a folder",
      description: "Returns any active (queued/processing) evaluation job for a folder.",
      querystring: folderQuerySchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          data: Type.Any(),
        }),
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      const { folderId } = req.query as { folderId: string };
      const job = await getActiveJobForFolder(folderId);

      return reply.status(200).send({
        success: true,
        data: job || null,
      });
    }),
  });

  // -------------------------------------------------------
  // POST /evaluate/cancel — cancel a queued/processing job
  // -------------------------------------------------------
  app.route({
    url: "/evaluate/cancel",
    method: "POST",
    schema: {
      tags: ["CSMS AI Evaluation"],
      summary: "Cancel an AI evaluation job",
      body: querySchema,
      response: {
        200: Type.Object({ success: Type.Boolean(), message: Type.String() }),
        400: errorSchema,
        409: errorSchema,
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      if ((req as any).session?.user?.role !== "admin") {
        return reply.status(409).send({ success: false, message: "Hanya admin yang dapat membatalkan evaluasi AI" });
      }
      const { jobId } = req.body as { jobId: string };
      const cancelled = await cancelEvaluationJob(jobId);
      if (!cancelled) {
        return reply.status(409).send({ success: false, message: "Job is not running anymore" });
      }
      return reply.status(200).send({ success: true, message: "Evaluasi AI dibatalkan" });
    }),
  });

  // -------------------------------------------------------
  // GET /evaluate/engine-health — is the CSMS-AI engine reachable?
  // -------------------------------------------------------
  app.route({
    url: "/evaluate/engine-health",
    method: "GET",
    schema: {
      tags: ["CSMS AI Evaluation"],
      summary: "CSMS-AI engine health",
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          data: Type.Object({ online: Type.Boolean(), latencyMs: Type.Union([Type.Number(), Type.Null()]), vision: Type.Union([Type.Boolean(), Type.Null()]) }),
        }),
      },
    },
    handler: withErrorHandler(async (_req, reply) => {
      return reply.status(200).send({ success: true, data: await getEngineHealth() });
    }),
  });
};

export default aiEvaluationRoutes;
