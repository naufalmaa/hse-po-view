// POST /subtypes/disable-all-auto
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { withErrorHandler } from "../../../../../utils/withErrorHandler.ts";
import { disableAllAutoCalculateManhours } from "../../../../../services/daily-report/subtypes.service.ts";
import { Type } from "@sinclair/typebox";

const SuccessDisableAllResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Object({
    updated: Type.Number(),
  }),
});

const ErrorResponse = Type.Object({
  success: Type.Optional(Type.Boolean()),
  message: Type.String(),
});

const DisableAllAutoSubtypesRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'POST',
    url: '/disable-all-auto',
    schema: {
      tags: ['Subtype'],
      summary: 'Disable autoCalculateManhours for all subtypes',
      response: {
        200: SuccessDisableAllResponse,
        500: ErrorResponse,
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      try {
        const result = await disableAllAutoCalculateManhours();
        return reply.status(200).send({
          success: true,
          message: 'Berhasil mematikan trigger otomatis manhours untuk seluruh project',
          data: result,
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: error?.message || 'Gagal mematikan trigger otomatis manhours',
        });
      }
    }),
  });
};

export default DisableAllAutoSubtypesRoutes;
