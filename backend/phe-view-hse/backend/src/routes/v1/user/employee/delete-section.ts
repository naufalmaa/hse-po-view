import {type Static, Type} from '@sinclair/typebox';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import {withErrorHandler} from "../../../../utils/withErrorHandler.ts";
import {deleteSectionById} from "../../../../services/employee/delete.service.ts";

const BodySchema = Type.Object({
  section: Type.Union([
    Type.Literal('contracts'),
    Type.Literal('mcus'),
    Type.Literal('bpjs'),
    Type.Literal('vaccinations'),
    Type.Literal('sika'),
    Type.Literal('certificates'),
  ]),
  sectionId: Type.Union([
    Type.String({ format: 'uuid' }),
    Type.Array(Type.String({ format: 'uuid' }))
  ]),
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

type SchemaType = Static<typeof BodySchema>;

const deleteSectionRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'POST',
    url: '/delete-section',
    schema: {
      tags: ['Employee'],
      summary: 'Delete section data (e.g., MCU, Contract) by ID(s)',
      body: BodySchema,
      response: {
        200: SuccessResponse,
        500: ErrorResponse
      }
    },
    handler: withErrorHandler(async (req, reply) => {
      try {
        const result = await deleteSectionById(req.body as SchemaType);
   
        return reply.status(200).send({ 
          success: true,
          message: req.i18n.t('user.employee.employeeSectionDeleted'),
          data: result.sectionId
        });
        
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: req.i18n.t('user.employee.employeeSectionDeleteFailed')
        });
      }
    }),
  });
};

export default deleteSectionRoute;