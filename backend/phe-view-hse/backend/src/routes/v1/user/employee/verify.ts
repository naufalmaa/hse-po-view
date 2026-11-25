import { Type } from '@sinclair/typebox';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { verifyEmployeeService } from '../../../../services/employee/validate.service.ts';

const SuccessResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Optional(Type.Any())
});

const ErrorResponse = Type.Object({
  success: Type.Optional(Type.Boolean()),
  message: Type.String()
});

const VerifyEmployeeRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'POST',
    url: '/verify/:employeeId',
    schema: {
      tags: ['Employee'],
      summary: 'Verify employee data (admin only)',
      params: Type.Object({
        employeeId: Type.String({ format: 'uuid' }),
      }),
      body: Type.Object({
        remarks: Type.Optional(Type.String()),
        verifiedBy: Type.Optional(Type.String()),
      }),
      response: {
        200: SuccessResponse,
        403: ErrorResponse,
        400: ErrorResponse,
        500: ErrorResponse
      }
    },
    handler: withErrorHandler(async (req, reply) => {
      const user = req.session.user;
      if (user.role !== 'admin') {
        return reply.status(403).send({ 
          success: false,
          message: req.i18n.t('user.employee.unauthorizedRole')
        });
      }

      const { employeeId } = req.params as { employeeId: string };
      const { remarks } = req.body as { remarks: string };
      const { verifiedBy } = req.body as { verifiedBy: string };

      try {
        const result = await verifyEmployeeService(employeeId, remarks, verifiedBy);
          return reply.status(200).send({ 
            success: true,
            message: req.i18n.t('user.employee.employeeVerified'),
            data: result.updated
          });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: req.i18n.t('user.employee.employeeVerifyFailed')
        });
      }
    }),
  });
};

export default VerifyEmployeeRoute;