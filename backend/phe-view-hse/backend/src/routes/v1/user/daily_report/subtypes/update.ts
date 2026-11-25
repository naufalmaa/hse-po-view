// PUT /subtypes/:id

import {Type} from "@sinclair/typebox";
import type {FastifyPluginAsyncTypebox} from "@fastify/type-provider-typebox";
import {updateSubtype} from "../../../../../services/daily-report/subtypes.service.ts";
import type {CreateSubtypeBody} from "../../../../../types/subtype.ts";
import {withErrorHandler} from "../../../../../utils/withErrorHandler.ts";

// === Schema ===
const WorkLocationSchema = Type.Object({
  id: Type.Optional(Type.String()),
  name: Type.String(),
  latitude: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  longitude: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  isDeleted: Type.Optional(Type.Boolean()),
});

const ExtraSchema = Type.Object({
  hoursPobPheOses: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  hoursPobContractor: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  target: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  autoCalculateManhours: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
});

const SubtypeSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.String(),
  extra: Type.Optional(Type.Union([ExtraSchema, Type.Null()])),
  workLocations: Type.Optional(Type.Array(Type.Any())),
});

const CreateSubtypeSchema = Type.Object({
  name: Type.String(),
  location: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  hoursPobPheOses: Type.Optional(Type.Number()),
  hoursPobContractor: Type.Optional(Type.Number()),
  target: Type.Optional(Type.Number()),
  autoCalculateManhours: Type.Optional(Type.Boolean()),
  workLocations: Type.Optional(Type.Array(WorkLocationSchema)),
});

const UpdateSubtypeSchema = Type.Partial(CreateSubtypeSchema);

const ErrorResponse = Type.Object({ 
  success: Type.Optional(Type.Boolean()),
  message: Type.String() 
});

const SuccessSingleResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: SubtypeSchema,
});

const updateSubtypeRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'PUT',
    url: '/:id',
    schema: {
      tags: ['Subtype'],
      summary: 'Update subtype by ID',
      params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
      body: UpdateSubtypeSchema,
      response: {
        200: SuccessSingleResponse,
        404: ErrorResponse,
        500: ErrorResponse,
      },
    },
    handler: withErrorHandler(async (req, reply) => {

      const { id } = req.params as { id: string };
      
      try {
        const updated = await updateSubtype(id, req.body as CreateSubtypeBody);
        if (!updated) {
          return reply.status(404).send({
            success: false,
            message: req.i18n.t('user.dailyReport.subtypes.subtypeNotFound')
          });
        }

        return reply.status(200).send({
          success: true,
          message: req.i18n.t('user.dailyReport.subtypes.subtypeUpdated'),
          data: updated
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: req.i18n.t('user.dailyReport.subtypes.subtypeUpdateFailed')
        });
      }
    }),
  });
}

export default updateSubtypeRoutes