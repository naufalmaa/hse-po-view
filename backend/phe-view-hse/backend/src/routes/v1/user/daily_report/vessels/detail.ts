// GET /vessels/:id
import type {FastifyPluginAsyncTypebox} from "@fastify/type-provider-typebox";
import {Type} from "@sinclair/typebox";
import {withErrorHandler} from "../../../../../utils/withErrorHandler.ts";
import {getVesselById} from "../../../../../services/daily-report/vessels.service.ts";

const ErrorResponse = Type.Object({ 
  success: Type.Optional(Type.Boolean()),
  message: Type.String() 
});

const SuccessResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Any()
});

const getVesselDetailRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'GET',
    url: '/:id',
    schema: {
      tags: ['Vessels'],
      summary: 'Get vessel by ID',
      params: Type.Object({id: Type.String({format: 'uuid'})}),
      response: {
        200: SuccessResponse,
        404: ErrorResponse,
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      const id = req.params as { id: string }
      const vessel = await getVesselById(id.id);
      if (!vessel) {
        return reply.status(404).send({
          success: false,
          message: req.i18n.t('user.dailyReport.vessels.vesselNotFound')
        });
      }

      return reply.status(200).send({
        success: true,
        message: req.i18n.t('user.dailyReport.vessels.vesselRetrieved'),
        data: vessel
      });
    }),
  });
}

export default getVesselDetailRoute