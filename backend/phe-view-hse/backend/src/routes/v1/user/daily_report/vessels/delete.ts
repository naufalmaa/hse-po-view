// DELETE /vessels/:id
import {Type} from "@sinclair/typebox";
import type {FastifyPluginAsyncTypebox} from "@fastify/type-provider-typebox";
import {withErrorHandler} from "../../../../../utils/withErrorHandler.ts";
import {deleteVessel} from "../../../../../services/daily-report/vessels.service.ts";

const SuccessResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
});

const ErrorResponse = Type.Object({ 
  success: Type.Optional(Type.Boolean()),
  message: Type.String() 
});

const deleteVesselsRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'DELETE',
    url: '/:id',
    schema: {
      tags: ['Vessels Under PO'],
      summary: 'Delete vessel by ID',
      params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
      response: {
        200: SuccessResponse,
        400: ErrorResponse,
        401: ErrorResponse,
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      const user = req.session.user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          message: req.i18n.t('user.dailyReport.vessels.unauthorized')
        });
      }
      
      const { id } = req.params as { id: string };
      const result = await deleteVessel(id);
      
      if (!result.success) {
        let messageKey = 'user.dailyReport.vessels.vesselDeleteFailed';
        
        if (result.inUse) {
          messageKey = result.inUseBy 
            ? `user.dailyReport.vessels.vesselInUse_${result.inUseBy}`
            : 'user.dailyReport.vessels.vesselInUse';
        }

        return reply.status(400).send({
          success: false,
          message: req.i18n.t(messageKey)
        });
      }
      
      return reply.status(200).send({
        success: true,
        message: req.i18n.t('user.dailyReport.vessels.vesselDeleted')
      });
    }),
  });
};

export default deleteVesselsRoutes;