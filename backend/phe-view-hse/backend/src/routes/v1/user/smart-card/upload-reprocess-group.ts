import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { reprocessErrorGroup } from '../../../../services/smartCardObservations/errorHandler.ts';

const reprocessGroupRoute: FastifyPluginAsyncTypebox = async (app) => {
  // POST /upload-observations/reprocess-group/:id - Reprocess all errors in a group
  app.route({
    method: 'POST',
    url: '/upload-observations/reprocess-group/:id',
    schema: {
      tags: ['Public API'],
      summary: 'Reprocess all errors in a group',
      description: 'Reprocess all failed upload rows for the same employee with optional employee ID override.',
      params: Type.Object({
        id: Type.String({ format: 'uuid' }),
      }),
      body: Type.Union([
        Type.Object({
          employeeId: Type.Optional(Type.String({ format: 'uuid' })),
        }),
        Type.Object({}),
      ]),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          stats: Type.Optional(Type.Object({
            successCount: Type.Number(),
            skipCount: Type.Number(),
            errorCount: Type.Number(),
          })),
        }),
        400: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
        404: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
        500: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
      },
    },

    handler: withErrorHandler(async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = req.body as { employeeId?: string } | undefined;
      const employeeId = body?.employeeId;

      try {
        const result = await reprocessErrorGroup(id, employeeId);

        if (result.success) {
          return reply.send({
            success: true,
            message: req.i18n.t('user.smartCard.errorGroupReprocessed'),
            stats: result.stats,
          });
        } else {
          return reply.code(400).send({
            success: false,
            message: req.i18n.t('user.smartCard.errorGroupReprocessFailed'),
          });
        }

      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          return reply.code(404).send({
            success: false,
            message: req.i18n.t('user.smartCard.errorGroupNotFound'),
          });
        }

        return reply.code(500).send({
          success: false,
          message: req.i18n.t('user.smartCard.errorGroupReprocessFailed'),
        });
      }
    }),
  });
};

export default reprocessGroupRoute;