import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import {  
  listEmployeesWithoutObservationsService
} from '../../../../services/smartCardObservations/employeeWithoutObservations.service.ts';
import type { ListEmployeesWithoutObservationsParams  } from '../../../../types/employeesWithoutObservations.ts';

const employeeWithoutObservationsRoute: FastifyPluginAsyncTypebox = async (app) => {
  // GET /employees-without-observations - Get all employees without observations
  app.route({
    method: 'GET',
    url: '/employees-without-observations',
    schema: {
      tags: ['Smart Card'],
      summary: 'Get employees without smart card observations',
      description: 'Retrieve list of all active employees who have not filled out smart card observations. Excludes crew marine category. Supports filtering by company and date range.',
      querystring: Type.Object({
        limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 10 })),
        page: Type.Optional(Type.Number({ minimum: 0, default: 0 })),
        search: Type.Optional(Type.String()),
        company: Type.Optional(Type.Union([Type.String(), Type.Array(Type.String())])),
        position: Type.Optional(Type.Array(Type.String())),
        category: Type.Optional(Type.Array(Type.String())),
        statusOnDuty: Type.Optional(Type.Array(Type.Boolean())),
        projectId: Type.Optional(Type.String()),
        vesselId: Type.Optional(Type.String()),
        date_start: Type.Optional(Type.String({ format: 'date' })),
        date_end: Type.Optional(Type.String({ format: 'date' })),
        sortBy: Type.Optional(Type.String({ default: 'employeeName' })),
        orderBy: Type.Optional(Type.Union([Type.Literal('asc'), Type.Literal('desc')], { default: 'asc' })),
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Array(Type.Object({
            id: Type.String(),
            employeeName: Type.Union([Type.String(), Type.Null()]),
            companyName: Type.Union([Type.String(), Type.Null()]),
            position: Type.Union([Type.String(), Type.Null()]),
            category: Type.Union([Type.String(), Type.Null()]),
            statusOnDuty: Type.Union([Type.Boolean(), Type.Null()]),
          })),
          meta: Type.Object({
            total: Type.Number(),
            page: Type.Number(),
            view: Type.Number(),
            totalPages: Type.Number(),
            date_start: Type.String(),
            date_end: Type.String(),
          }),
        }),
        500: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
      },
    },

    handler: withErrorHandler(async (req, reply) => {
      const query = req.query as ListEmployeesWithoutObservationsParams;

      try {
        const result = await listEmployeesWithoutObservationsService(query);
        return reply.send({
          success: true,
          message: req.i18n.t('user.smartCard.employeesWithoutObservationsRetrieved'),
          data: result.data,
          meta: result.meta
        });

      } catch (error) {
        return reply.code(500).send({
          success: false,
          message: req.i18n.t('user.smartCard.employeesWithoutObservationsFailed')
        });
      }
    }),
  });
};

export default employeeWithoutObservationsRoute;