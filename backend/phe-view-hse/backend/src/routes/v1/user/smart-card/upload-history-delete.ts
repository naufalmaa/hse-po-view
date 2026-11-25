import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { deleteUploadHistoryByIds } from '../../../../services/smartCardObservations/deleteUploadHistory.service.ts';

const uploadHistoryDeleteRoute: FastifyPluginAsyncTypebox = async (app) => {
  // Delete Upload History Route
  app.route({
    method: 'DELETE',
    url: '/upload-observations/history',
    schema: {
      tags: ['Smart Card'],
      summary: 'Delete Upload History',
      description: 'Delete upload history records by their IDs. This will also delete associated observation errors.',
      body: Type.Object({
        ids: Type.Array(Type.String(), {
          description: 'Array of upload history IDs to delete',
          minItems: 1
        })
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({
            deletedCount: Type.Number()
          })
        }),
        400: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        }),
        500: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        })
      }
    },

    handler: withErrorHandler(async (req, reply) => {
      try {
        const { ids } = req.body as { ids: string[] };
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
          return reply.code(400).send({
            success: false,
            message: req.i18n.t('user.smartCard.deleteUploadHistoryInvalidIds')
          });
        }
        
        const deletedCount = await deleteUploadHistoryByIds(ids);
        
        return reply.send({
          success: true,
          message: req.i18n.t('user.smartCard.deleteUploadHistorySuccess'),
          data: {
            deletedCount
          }
        });
      } catch (error) {
        return reply.code(500).send({
          success: false,
          message: req.i18n.t('user.smartCard.deleteUploadHistoryFailed')
        });
      }
    })
  });
};

export default uploadHistoryDeleteRoute;