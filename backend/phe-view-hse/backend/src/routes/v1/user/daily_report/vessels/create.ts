 // POST /vessels-under-po
import {Type} from "@sinclair/typebox";
 import type {FastifyPluginAsyncTypebox} from "@fastify/type-provider-typebox";
import {createVessel, type Vessel} from "../../../../../services/daily-report/vessels.service.ts";
import {withErrorHandler} from "../../../../../utils/withErrorHandler.ts";

const SuccessResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Optional(Type.Any())
});

const ErrorResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String()
});


const createVesselUnderPoRoute: FastifyPluginAsyncTypebox = async (app) => {
 app.route({
    method: 'POST',
    url: '/add',
    schema: {
     tags: ['Vessels Under PO'],
     summary: 'Create new vessel',
     responses: {
        200: SuccessResponse,
        500: ErrorResponse
      }
    },
    handler: withErrorHandler(async (req, reply) => {
      try {
        const data = await createVessel(req.body as Vessel);
        return reply.status(200).send({
          success: true,
          message: req.i18n.t('user.dailyReport.vessels.vesselCreated'),
          data
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: req.i18n.t('user.dailyReport.vessels.vesselCreateFailed')
        });
      }
    }),
 });
}

export default createVesselUnderPoRoute