import {Type} from "@sinclair/typebox";
import type {FastifyPluginAsyncTypebox} from "@fastify/type-provider-typebox";
import {
  updateVessel,
  type Vessel
} from "../../../../../services/daily-report/vessels.service.ts";
import {withErrorHandler} from "../../../../../utils/withErrorHandler.ts";

const ErrorResponse = Type.Object({ 
  success: Type.Optional(Type.Boolean()),
  message: Type.String() 
});

const SuccessResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Any()
});

const updateVesselRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'PUT',
    url: '/:id',
    schema: {
      tags: ['Vessels'],
      summary: 'Update vessel by ID',
      params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
      response: {
        200: SuccessResponse,
        404: ErrorResponse,
        500: ErrorResponse,
      },
    },
    handler: withErrorHandler(async (req, reply) => {

      const id = req.params as { id: string }
      
      try {
        const updated = await updateVessel(id.id, req.body as Vessel);
        if (!updated) {
          return reply.status(404).send({
            success: false,
            message: req.i18n.t('user.dailyReport.vessels.vesselNotFound')
          });
        }

        return reply.status(200).send({
          success: true,
          message: req.i18n.t('user.dailyReport.vessels.vesselUpdated'),
          data: updated
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: req.i18n.t('user.dailyReport.vessels.vesselUpdateFailed') + ': ' + (error.message || 'Unknown error')
        });
      }
   }),
  });
}

export default updateVesselRoutes