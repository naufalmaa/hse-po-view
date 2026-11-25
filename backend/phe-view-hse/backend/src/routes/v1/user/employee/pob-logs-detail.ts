import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { getPobUnmatchedLogDetailService } from '../../../../services/employee/pob-logs-detail.service.ts';

const LogDetailResponse = Type.Object({
  id: Type.String(),
  uploadedAt: Type.Union([Type.String(), Type.Null()]),
  unmatchedCount: Type.Union([Type.Number(), Type.Null()]),
  filename: Type.Union([Type.String(), Type.Null()]),
  data: Type.Union([Type.Array(Type.Any()), Type.Null()]),
  summary: Type.Optional(Type.Object({
    totalUnmatched: Type.Number(),
    withSuggestion: Type.Number(),
    highCertainty: Type.Number(),
    withoutSuggestion: Type.Number()
  }))
});

const pobLogsDetailRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'GET',
    url: '/pob-unmatched-logs/:id',
    schema: {
      summary: 'Get POB unmatched log detail',
      tags: ['Employee'],
      params: Type.Object({
        id: Type.String()
      }),
      query: Type.Object({
        page: Type.Optional(Type.Number({ default: 0 })),
        limit: Type.Optional(Type.Number()),
        filter: Type.Optional(Type.String({ default: 'all' })), // all, with_suggestion, without_suggestion
        sortBy: Type.Optional(Type.String({ default: 'similarity' })), // similarity, name
        orderBy: Type.Optional(Type.String({ default: 'desc' })) // asc, desc
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Union([LogDetailResponse, Type.Null()]),
          meta: Type.Optional(Type.Object({
            total: Type.Number(),
            page: Type.Number(),
            view: Type.Number(),
            totalPages: Type.Number()
          }))
        }),
        404: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        })
      }
    },
    handler: withErrorHandler(async (req, reply) => {
      const { id } = req.params as { id: string };
      const { page, limit, filter, sortBy, orderBy } = req.query as any;
      
      const result = await getPobUnmatchedLogDetailService(id, { 
        page: page !== undefined ? Number(page) : undefined, 
        limit: limit !== undefined ? Number(limit) : undefined, 
        filter, 
        sortBy, 
        orderBy 
      });
      
      if (!result) {
        return reply.code(404).send({
          success: false,
          message: req.i18n.t('user.employee.pobLogsDetailNotFound'),
        });
      }

      const { meta, ...logData } = result;

      return reply.send({
        success: true,
        message: req.i18n.t('user.employee.pobLogsDetail'),
        data: logData as any,
        meta: meta
      });
    })
  });
};

export default pobLogsDetailRoute;
