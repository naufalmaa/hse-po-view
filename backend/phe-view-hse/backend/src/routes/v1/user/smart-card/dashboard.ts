import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { getSmartCardDashboardService } from '../../../../services/smartCardObservations/dashboard.service.ts';
import type { SmartCardDashboardParams } from '../../../../services/smartCardObservations/dashboard.service.ts';

const smartCardDashboardRoute: FastifyPluginAsyncTypebox = async (app) => {
  // GET /dashboard - Get smart card dashboard data
  app.route({
    method: 'GET',
    url: '/dashboard',
    schema: {
      tags: ['Smart Card'],
      summary: 'Get smart card dashboard data',
      description: 'Retrieve submission statistics per month for all active employees based on date range.',
      querystring: Type.Object({
        limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 10 })),
        page: Type.Optional(Type.Number({ minimum: 0, default: 0 })),
        search: Type.Optional(Type.String()),
        company: Type.Optional(Type.Union([Type.String(), Type.Array(Type.String())])),
        category: Type.Optional(Type.Union([Type.String(), Type.Array(Type.String())])),
        position: Type.Optional(Type.Array(Type.String())),
        projectId: Type.Optional(Type.Union([Type.String(), Type.Array(Type.String())])),
        vesselId: Type.Optional(Type.Union([Type.String(), Type.Array(Type.String())])),
        date_start: Type.Optional(Type.String({ format: 'date' })),
        date_end: Type.Optional(Type.String({ format: 'date' })),
        sortBy: Type.Optional(Type.String({ default: 'employeeName' })),
        orderBy: Type.Optional(Type.Union([Type.Literal('asc'), Type.Literal('desc')], { default: 'asc' })),
        targetPerMonth: Type.Optional(Type.Number({ default: 10 })),
        employeeStatus: Type.Optional(Type.Union([Type.Literal('all'), Type.Literal('registered'), Type.Literal('unmatched')], { default: 'all' })),
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Array(Type.Object({
            id: Type.String(),
            employeeName: Type.Union([Type.String(), Type.Null()]),
            companyName: Type.Union([Type.String(), Type.Null()]),
            category: Type.Union([Type.String(), Type.Null()]),
            position: Type.Union([Type.String(), Type.Null()]),
            monthlySubmissions: Type.Record(Type.String(), Type.Number()),
            totalSubmissions: Type.Number(),
            target: Type.Number(),
            rate: Type.Number(),
            companyId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
            vesselId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
            vesselName: Type.Optional(Type.Union([Type.String(), Type.Null()])),
            projectId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
            projectName: Type.Optional(Type.Union([Type.String(), Type.Null()])),
            suggestions: Type.Optional(Type.Array(Type.Object({
              id: Type.String(),
              employeeName: Type.String(),
              companyName: Type.String(),
              similarity: Type.Number(),
            }))),
            errorId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
          })),
          summary: Type.Object({
            monthlyTotals: Type.Record(Type.String(), Type.Number()),
            grandTotal: Type.Number(),
          }),
          meta: Type.Object({
            total: Type.Number(),
            page: Type.Number(),
            view: Type.Number(),
            totalPages: Type.Number(),
            date_start: Type.String(),
            date_end: Type.String(),
            months: Type.Array(Type.Object({
              key: Type.String(),
              label: Type.String(),
            })),
          }),
        }),
        500: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
      },
    },

    handler: withErrorHandler(async (req, reply) => {
      const query = req.query as SmartCardDashboardParams;
      const user = req.session.user;

      try {
        const result = await getSmartCardDashboardService({
          ...query,
          userId: user.id,
          role: user.role
        });
        return reply.send({
          success: true,
          message: req.i18n.t('user.smartCard.dashboardRetrieved'),
          data: result.data,
          summary: result.summary,
          meta: result.meta
        });

      } catch (error) {
        return reply.code(500).send({
          success: false,
          message: req.i18n.t('user.smartCard.dashboardFailed')
        });
      }
    }),
  });
};

export default smartCardDashboardRoute;
