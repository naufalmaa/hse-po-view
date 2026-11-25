 // POST /subtypes
import type {FastifyPluginAsyncTypebox} from "@fastify/type-provider-typebox";
import {createSubtype} from "../../../../../services/daily-report/subtypes.service.ts";
import {Type} from "@sinclair/typebox";
import {withErrorHandler} from "../../../../../utils/withErrorHandler.ts";
import type {CreateSubtypeBody} from "../../../../../types/subtype.ts";

// === Schema ===
const WorkLocationInputSchema = Type.Object({
  id: Type.Optional(Type.String()),
  name: Type.String(),
  latitude: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  longitude: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  isDeleted: Type.Optional(Type.Boolean()),
});

const CreateSubtypeSchema = Type.Object({
  name: Type.String(),
  location: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  hoursPobPheOses: Type.Optional(Type.Number()),
  hoursPobContractor: Type.Optional(Type.Number()),
  target: Type.Optional(Type.Number()),
  autoCalculateManhours: Type.Optional(Type.Boolean()),
  workLocations: Type.Optional(Type.Array(WorkLocationInputSchema)),
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


const createSubtypeRoute: FastifyPluginAsyncTypebox = async (fastify) => {
  fastify.route({
    method: "POST",
    url: "/",
    schema: {
      tags: ["Subtype"],
      summary: "Create a new subtype",
      body: CreateSubtypeSchema,
      responses: {
        200: SuccessResponse,
        500: ErrorResponse
      }
    },
    handler: withErrorHandler(async (req, reply) => {
      
      const body = req.body as CreateSubtypeBody;
      
      try {
        const subtype = await createSubtype({
          name: body.name,
          hoursPobPheOses: body.hoursPobPheOses ?? null,
          hoursPobContractor: body.hoursPobContractor ?? null,
          target: body.target ?? null,
          autoCalculateManhours: body.autoCalculateManhours,
          workLocations: body.workLocations,
        });
        
        return reply.status(200).send({
          success: true,
          message: req.i18n.t('user.dailyReport.subtypes.subtypeCreated'),
          data: subtype
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: req.i18n.t('user.dailyReport.subtypes.subtypeCreateFailed')
        });
      }
    })
  });
}

export default createSubtypeRoute