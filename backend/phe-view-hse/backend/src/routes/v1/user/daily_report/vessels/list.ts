 // GET /vessels
import type {FastifyPluginAsyncTypebox} from "@fastify/type-provider-typebox";
import {Type} from "@sinclair/typebox";
import {listVessels} from "../../../../../services/daily-report/vessels.service.ts";
import {withErrorHandler} from "../../../../../utils/withErrorHandler.ts";

const SuccessListResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Array(Type.Any())
});

const ErrorResponse = Type.Object({ 
  success: Type.Optional(Type.Boolean()),
  message: Type.String() 
});

const vesselsUnderPoRoutes: FastifyPluginAsyncTypebox = async (app) => {
 app.route({
   method: 'GET',
   url: '/list',
   schema: {
     tags: ['Vessels Under PO'],
     summary: 'List all vessels',
     querystring: Type.Object({
       unassigned: Type.Optional(Type.Boolean())
     }),
     response: {
       200: SuccessListResponse,
       500: ErrorResponse,
     },
   },
   handler: withErrorHandler(async (req, reply) => {
      try {
        const { unassigned } = req.query as { unassigned?: boolean };
        const data = await listVessels(unassigned === true);
        return reply.status(200).send({
          success: true,
          message: req.i18n.t('user.dailyReport.vessels.vesselsListed'),
          data
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: req.i18n.t('user.dailyReport.vessels.vesselsListFailed')
        });
      }
   }),
 });
}

export default vesselsUnderPoRoutes