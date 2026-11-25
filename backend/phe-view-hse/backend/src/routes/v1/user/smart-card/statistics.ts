import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import {  
  getObservationStatistics,
} from '../../../../services/smartCardObservations/employeeWithoutObservations.service.ts';

const statisticsObservationsRoute: FastifyPluginAsyncTypebox = async (app) => {
  // GET /observation-statistics - Get observation coverage statistics
  app.route({
    method: 'GET',
    url: '/observation-statistics',
    schema: {
      tags: ['Smart Card'],
      summary: 'Get smart card observation statistics',
      description: 'Get statistics about observation counts across active employees. Supports date range filtering.',
      querystring: Type.Object({
        startDate: Type.Optional(Type.String({ format: 'date' })),
        endDate: Type.Optional(Type.String({ format: 'date' })),
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({
            totalActiveEmployees: Type.Number(),
            totalAllEmployees: Type.Number(),
            employeesWithObservations: Type.Number(),
            employeesWithoutObservations: Type.Number(),
          }),
        }),
        500: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      try {
        const query = req.query as {
          startDate?: string;
          endDate?: string;
        };
        const user = req.session.user;
        
        const statistics = await getObservationStatistics(
          query.startDate,
          query.endDate,
          user.id,
          user.role
        );

        return reply.send({
          success: true,
          message: req.i18n.t('user.smartCard.observationStatisticsRetrieved'),
          data: statistics,
        });

      } catch (error) {
        return reply.code(500).send({
          success: false,
          message: req.i18n.t('user.smartCard.observationStatisticsFailed'),
        });
      }
    }),
  });
};

export default statisticsObservationsRoute;