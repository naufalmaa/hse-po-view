import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { getUploadErrors } from '../../../../services/smartCardObservations/errorHandler.ts';

const uploadErrorsRoute: FastifyPluginAsyncTypebox = async (app) => {
// GET /upload-observations/errors - List all error rows
  app.route({
    method: 'GET',
    url: '/upload-observations/errors',
    schema: {
      tags: ['Public API'],
      summary: 'Get all upload errors',
      description: 'Retrieve list of all failed rows from smart card observations upload with suggestions for resolution.',
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Array(Type.Object({
            id: Type.String(),
            employeeName: Type.String(),
            companyName: Type.String(),
            errorType: Type.String(),
            count: Type.Number(),
            errorIds: Type.Array(Type.String()),
            suggestions: Type.Array(Type.Object({
              id: Type.String(),
              employeeName: Type.Union([Type.String(), Type.Null()]),
              companyName: Type.Union([Type.String(), Type.Null()]),
              similarity: Type.Number(),
            })),
            sampleRow: Type.Object({}, { additionalProperties: true }),
            createdAt: Type.String({ format: 'date-time' }),
          })),
          count: Type.Number(),
        }),
        500: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
      },
    },

    handler: withErrorHandler(async (req, reply) => {
      try {
        const user = req.session.user;
        const errors = await getUploadErrors(user.id, user.role);

        return reply.send({
          success: true,
          message: req.i18n.t('user.smartCard.uploadErrorsRetrieved'),
          data: errors.map((error: any) => ({
            ...error,
            createdAt: error.createdAt.toISOString(),
          })),
          count: errors.length,
        });

      } catch (error) {
        return reply.code(500).send({
          success: false,
          message: req.i18n.t('user.smartCard.uploadErrorsFailed'),
        });
      }
    }),
  });
}

export default uploadErrorsRoute;