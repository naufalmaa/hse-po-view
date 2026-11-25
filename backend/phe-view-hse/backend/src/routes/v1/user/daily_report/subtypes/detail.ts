// GET /subtypes/:id
import type {FastifyPluginAsyncTypebox} from "@fastify/type-provider-typebox";
import {Type} from "@sinclair/typebox";
import {getSubtypeById} from "../../../../../services/daily-report/subtypes.service.ts";
import {withErrorHandler} from "../../../../../utils/withErrorHandler.ts";

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

const ErrorResponse = Type.Object({ 
  success: Type.Optional(Type.Boolean()),
  message: Type.String() 
});

const SuccessResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: SubtypeSchema,
});

const getSubtypeDetailRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'GET',
    url: '/:id',
    schema: {
      tags: ['Subtype'],
      summary: 'Get subtype by ID',
      params: Type.Object({id: Type.String({format: 'uuid'})}),
      response: {
        200: SuccessResponse,
        404: ErrorResponse,
      },
    },
    handler: withErrorHandler(async (req, reply) => {
  
      const { id } = req.params as { id: string };

      const subtype = await getSubtypeById(id);
      if (! subtype) {
        return reply.status(404).send({
          success: false,
          message: req.i18n.t('user.dailyReport.subtypes.subtypeNotFound')
        });
      }

      return reply.status(200).send({
        success: true,
        message: req.i18n.t('user.dailyReport.subtypes.subtypeRetrieved'),
        data: subtype
      });
    }),
  });
}

export default getSubtypeDetailRoute