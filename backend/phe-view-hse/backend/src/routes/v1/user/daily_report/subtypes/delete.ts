// DELETE /subtypes/:id
import {Type} from "@sinclair/typebox";
import type {FastifyPluginAsyncTypebox} from "@fastify/type-provider-typebox";
import {withErrorHandler} from "../../../../../utils/withErrorHandler.ts";
import {deleteSubtype} from "../../../../../services/daily-report/subtypes.service.ts";

const SuccessMessageResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
});

const ErrorResponse = Type.Object({ 
  success: Type.Optional(Type.Boolean()),
  message: Type.String() 
});

const deleteSubtypeRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'DELETE',
    url: '/:id',
    schema: {
      tags: ['Subtype'],
      summary: 'Delete subtype by ID',
      params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
      response: {
        200: SuccessMessageResponse,
        401: ErrorResponse,
      },
    },
    handler: withErrorHandler(async (req, reply) => {

      const { id } = req.params as { id: string };
      
      try {
        await deleteSubtype(id);
        return reply.status(200).send({
          success: true,
          message: req.i18n.t('user.dailyReport.subtypes.subtypeDeleted')
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: req.i18n.t('user.dailyReport.subtypes.subtypeDeleteFailed')
        });
      }
    }),
  });
};

export default deleteSubtypeRoute;