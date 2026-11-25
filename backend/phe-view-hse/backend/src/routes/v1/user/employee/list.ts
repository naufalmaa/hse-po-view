import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { listEmployeesService } from '../../../../services/employee/list.service.ts';
import type { ListEmployeeParams } from '../../../../types/employee.ts';
import { Type } from '@sinclair/typebox';
import { convertArrayTimestampsToWIB } from '../../../../utils/timezone.ts';

const SuccessResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Any(),
  meta: Type.Optional(Type.Any())
});

const ErrorResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String()
});

const listAllEmployeesRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/list',
    method: 'POST',
    schema: {
      tags: ['Employee'],
      summary: 'List Employees',
      response: {
        200: SuccessResponse,
        500: ErrorResponse
      }
    },
    handler: withErrorHandler(async (req, reply) => {
      try {
        const user = req.session.user;

        const filters = req.body as Partial<ListEmployeeParams>;

        const data = await listEmployeesService({
          ...filters,
          userId: user.id,
          role: user.role,
        });

        // Convert timestamps to WIB timezone
        const convertedData = convertArrayTimestampsToWIB(data.data);

        return reply.status(200).send({ 
          success: true,
          message: req.i18n.t('user.employee.employeesListed'),
          data: convertedData,
          meta: data.meta
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: req.i18n.t('user.employee.employeesListFailed')
        });
      }
    }),
  });
};

export default listAllEmployeesRoute;