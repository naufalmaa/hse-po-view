import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { deletePobUnmatchedLogService } from '../../../../services/employee/pob-logs-delete.service.ts';

const pobLogsDeleteRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'DELETE',
    url: '/pob-unmatched-logs/:id',
    schema: {
      summary: 'Delete unmatched POB log',
      tags: ['Employee'],
      params: Type.Object({
        id: Type.String()
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        })
      }
    },
    handler: withErrorHandler(async (req, reply) => {
      const { id } = req.params as { id: string };
      await deletePobUnmatchedLogService(id);
      return reply.send({
        success: true,
        message: req.i18n.t('user.employee.pobLogDeleted')
      });
    })
  });
};

export default pobLogsDeleteRoute;
