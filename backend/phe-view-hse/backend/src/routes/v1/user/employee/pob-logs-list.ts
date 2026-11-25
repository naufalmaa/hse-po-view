import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { listPobUnmatchedLogsService } from '../../../../services/employee/pob-logs-list.service.ts';

const UnmatchedLogSchema = Type.Object({
  id: Type.String(),
  uploadedAt: Type.Union([Type.String(), Type.Null()]),
  unmatchedCount: Type.Union([Type.Number(), Type.Null()]),
  filename: Type.Union([Type.String(), Type.Null()])
});

const SuccessResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Array(UnmatchedLogSchema)
});

const pobLogsListRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'GET',
    url: '/pob-unmatched-logs',
    schema: {
      summary: 'List unmatched POB logs',
      tags: ['Employee'],
      response: {
        200: SuccessResponse
      }
    },
    handler: withErrorHandler(async (req, reply) => {
      const logs = await listPobUnmatchedLogsService();
      return reply.send({
        success: true,
        message: req.i18n.t('user.employee.pobLogsList'),
        data: logs as any
      });
    })
  });
};

export default pobLogsListRoute;
