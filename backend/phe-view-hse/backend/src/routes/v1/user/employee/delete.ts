import {type Static, Type} from '@sinclair/typebox';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import {withErrorHandler} from "../../../../utils/withErrorHandler.ts";
import {deleteByEmployeeId} from "../../../../services/employee/delete.service.ts";

const BodySchema = Type.Object({
  employeeId: Type.Union([
    Type.String({ format: 'uuid' }),
    Type.Array(Type.String({ format: 'uuid' }))
  ]),
  hardDelete: Type.Optional(Type.Boolean())
});

const SuccessResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Optional(Type.Any())
});

const ErrorResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String()
});

type bodyType = Static<typeof BodySchema>;

const deleteEmployeeRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'POST',
    url: '/delete',
    schema: {
      tags: ['Employee'],
      summary: 'Delete employee(s) and all related data by ID',
      body: BodySchema,
      response: {
        200: SuccessResponse,
        400: ErrorResponse,
        500: ErrorResponse
      }
    },
    handler: withErrorHandler(async (req, reply) => {
      try {
        const result = await deleteByEmployeeId(req.body as bodyType);
        
        if ('requiresConfirmation' in result && result.requiresConfirmation) {
          return reply.status(200).send({
            success: false,
            message: req.i18n.t('user.employee.deleteWarningConnections'),
            data: {
              employeeId: result.employeeId,
              connections: result.connections
            }
          });
        }

        return reply.status(200).send({ 
          success: true,
          message: req.i18n.t('user.employee.employeeDeleted'),
          data: result.employeeId
        });

      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: req.i18n.t('user.employee.employeeDeleteFailed')
        });
      }
    }),
  });
};

export default deleteEmployeeRoute;