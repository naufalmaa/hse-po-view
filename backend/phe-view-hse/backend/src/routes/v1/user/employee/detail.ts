import { Type } from '@sinclair/typebox';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { getEmployeeDetailService } from '../../../../services/employee/detail.service.ts';
import type {ListEmployeeParams} from "../../../../types/employee.ts";
import { convertDeepTimestampsToWIB } from '../../../../utils/timezone.ts';

const SuccessResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Any()
});

const ErrorResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String()
});

const detailEmployeeRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'POST',
    url: '/detail/:employeeId',
    schema: {
      tags: ['Employee'],
      summary: 'Detail employee by id (with navigation)',
      params: Type.Object({
        employeeId: Type.String({ format: 'uuid' }),
      }),
      response: {
        200: SuccessResponse,
        400: ErrorResponse,
        500: ErrorResponse
      }
    },
    handler: withErrorHandler(async (req, reply) => {
      try {
        const { employeeId } = req.params as { employeeId: string };
       const { filters } = req.body as {
          filters?: Partial<ListEmployeeParams>;
        };

        const data = await getEmployeeDetailService(employeeId, {
          withNavigation: true,
          filters,
        });

        // Convert timestamps to WIB timezone
        const convertedData = convertDeepTimestampsToWIB(data);

        return reply.status(200).send({ 
          success: true, 
          message: req.i18n.t('user.employee.employeeDetailRetrieved'),
          data: convertedData
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: req.i18n.t('user.employee.employeeNotFound')
        });
      }
    }),
  });
};

export default detailEmployeeRoute;