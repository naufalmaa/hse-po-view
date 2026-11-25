import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { withErrorHandler } from "../../../../../../utils/withErrorHandler.ts";
import { Type } from '@sinclair/typebox';
import { runCopyJob, validateCopyRequest } from "../../../../../../services/csms/contract/copy-pb-files.service.ts";
import { COPY_CONFLICT_MESSAGE, copyJobs } from "../../../../../../services/csms/contract/copy-pb-jobs.ts";

const bodySchema = Type.Object({
  sourceFolderId: Type.String({ format: 'uuid' }),
  targetFolderId: Type.String({ format: 'uuid' }),
  // also copy score, status and note per category (default true, the behaviour before this option)
  copyScores: Type.Optional(Type.Boolean()),
  // also copy the User note / the contractor note per category (default true; an empty source note never overwrites)
  copyUserNotes: Type.Optional(Type.Boolean()),
  copyContractorNotes: Type.Optional(Type.Boolean()),
  // categories 1..8 whose scores are copied; empty or missing = all
  categoryNumbers: Type.Optional(Type.Array(Type.Integer({ minimum: 1, maximum: 8 }), { maxItems: 8 })),
});

const errorSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String()
});

const isAdmin = (req: any) => req.session?.user?.role === 'admin';

const copyPBFilesRoutes: FastifyPluginAsyncTypebox = async (app) => {
  // Starts the copy in the background and answers right away (202 + jobId); poll GET /copy-pb-files/:jobId.
  // A large PB used to run longer than the proxy timeout (504) while the copy kept running.
  app.route({
    url: '/copy-pb-files',
    method: 'POST',
    schema: {
      tags: ['CSMS Contract'],
      summary: 'Start copying PB files if source folder is complete',
      description: 'Starts a background job that copies all files from a completed source folder to a target folder. Poll GET /copy-pb-files/:jobId for the result.',
      body: bodySchema,
      response: {
        202: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({ jobId: Type.String() }),
        }),
        400: errorSchema,
        403: errorSchema,
        404: errorSchema,
        409: errorSchema,
        500: errorSchema,
      }
    },
    handler: withErrorHandler(async (req, reply) => {
      const { sourceFolderId, targetFolderId, copyScores, copyUserNotes, copyContractorNotes, categoryNumbers } = req.body as {
        sourceFolderId: string;
        targetFolderId: string;
        copyScores?: boolean;
        copyUserNotes?: boolean;
        copyContractorNotes?: boolean;
        categoryNumbers?: number[];
      };

      // Copying an assessment to another period is admin only
      if (!isAdmin(req)) {
        return reply.status(403).send({
          success: false,
          message: 'Hanya admin yang dapat menyalin data penilaian',
        });
      }

      if (!sourceFolderId || !targetFolderId) {
        return reply.status(400).send({
          success: false,
          message: 'Source folder ID and target folder ID are required',
        });
      }

      // fast refusal before the (slower) validation; the real lock is taken by copyJobs.start below
      if (copyJobs.findConflict(sourceFolderId, targetFolderId)) {
        return reply.status(409).send({ success: false, message: COPY_CONFLICT_MESSAGE });
      }

      try {
        const invalid = await validateCopyRequest(sourceFolderId, targetFolderId);
        if (invalid) {
          return reply.status(invalid.status).send({ success: false, message: invalid.message });
        }

        const started = copyJobs.start(sourceFolderId, targetFolderId);
        if (!started.ok) {
          return reply.status(409).send({ success: false, message: COPY_CONFLICT_MESSAGE });
        }

        // runCopyJob never rejects (errors are stored in the job)
        void runCopyJob(copyJobs, started.job.id, sourceFolderId, targetFolderId, { copyScores, copyUserNotes, copyContractorNotes, categoryNumbers });

        return reply.status(202).send({
          success: true,
          message: 'Penyalinan dimulai',
          data: { jobId: started.job.id },
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: error.message || 'Failed to copy PB files',
        });
      }
    })
  });

  app.route({
    url: '/copy-pb-files/:jobId',
    method: 'GET',
    schema: {
      tags: ['CSMS Contract'],
      summary: 'Status of a copy PB files job',
      params: Type.Object({ jobId: Type.String({ format: 'uuid' }) }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          status: Type.Union([Type.Literal('running'), Type.Literal('completed'), Type.Literal('failed')]),
          progress: Type.Object({ done: Type.Integer(), total: Type.Integer() }),
          message: Type.String(),
          data: Type.Optional(Type.Any()),
        }),
        403: errorSchema,
        404: errorSchema,
      }
    },
    handler: withErrorHandler(async (req, reply) => {
      if (!isAdmin(req)) {
        return reply.status(403).send({
          success: false,
          message: 'Hanya admin yang dapat menyalin data penilaian',
        });
      }
      const { jobId } = req.params as { jobId: string };
      const job = copyJobs.get(jobId);
      if (!job) {
        return reply.status(404).send({
          success: false,
          message: 'Status penyalinan tidak ditemukan (kedaluwarsa atau server dimulai ulang). Muat ulang halaman untuk melihat hasilnya.',
        });
      }
      return reply.status(200).send({
        success: true,
        status: job.status,
        progress: job.progress,
        message: job.message,
        data: job.data ?? undefined,
      });
    })
  });
};

export default copyPBFilesRoutes;
