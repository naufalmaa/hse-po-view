 // GET /subtypes
import type {FastifyPluginAsyncTypebox} from "@fastify/type-provider-typebox";
import {withErrorHandler} from "../../../../../utils/withErrorHandler.ts";
import {listSubtypes} from "../../../../../services/daily-report/subtypes.service.ts";
import {Type} from "@sinclair/typebox";

 // === Schema ===
const ExtraSchema = Type.Object({
  hoursPobPheOses: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  hoursPobContractor: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  target: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  autoCalculateManhours: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
});

const WorkLocationSchema = Type.Object({
  id: Type.String(),
  projectId: Type.String(),
  name: Type.String(),
  latitude: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  longitude: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

const SubtypeSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.String(),
  extra: Type.Optional(Type.Union([ExtraSchema, Type.Null()])),
  workLocations: Type.Optional(Type.Array(WorkLocationSchema)),
});

const SuccessListResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Array(SubtypeSchema),
});

const ErrorResponse = Type.Object({ 
  success: Type.Optional(Type.Boolean()),
  message: Type.String() 
});

const ListSubtypesRoutes: FastifyPluginAsyncTypebox = async (app) => {
 app.route({
  method: 'GET',
  url: '/list',
  schema: {
     tags: ['Subtype'],
     summary: 'List all subtypes',
     response: {
       200: SuccessListResponse,
       500: ErrorResponse,
     },
  },
  handler: withErrorHandler(async (req, reply) => {
    try {
      const data = await listSubtypes();
      return reply.status(200).send({
        success: true,
        message: req.i18n.t('user.dailyReport.subtypes.subtypesListed'),
        data
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: req.i18n.t('user.dailyReport.subtypes.subtypesListFailed')
      });
    }
  }),
 });
}

export default ListSubtypesRoutes