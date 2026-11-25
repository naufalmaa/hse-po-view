import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { reprocessErrorRow } from '../../../../services/smartCardObservations/errorHandler.ts';

const reprocessRoute: FastifyPluginAsyncTypebox = async (app) => {
// POST /upload-observations/reprocess/:id - Reprocess single error row
  app.route({
    method: 'POST',
    url: '/upload-observations/reprocess/:id',
    schema: {
      tags: ['Public API'],
      summary: 'Reprocess single error row',
      description: 'Reprocess a failed upload row with optional employee ID override.',
      params: Type.Object({
        id: Type.String({ format: 'uuid' }),
      }),
      body: Type.Union([
        Type.Object({
          employeeId: Type.Optional(Type.String({ format: 'uuid' })),
        }),
        Type.Object({}), // Allow empty object
      ]),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
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
        const result = await reprocessErrorRow(id, employeeId);

        if (result.success) {
          return reply.send({
            success: true,
            message: req.i18n.t('user.smartCard.errorRowReprocessed'),
          });
        } else {
          return reply.code(400).send({
            success: false,
            message: req.i18n.t('user.smartCard.errorRowReprocessFailed'),
          });
        }

      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          return reply.code(404).send({
            success: false,
            message: req.i18n.t('user.smartCard.errorRowNotFound'),
          });
        }

        return reply.code(500).send({
          success: false,
          message: req.i18n.t('user.smartCard.errorRowReprocessFailed'),
        });
      }
    }),
  });
}

export default reprocessRoute;