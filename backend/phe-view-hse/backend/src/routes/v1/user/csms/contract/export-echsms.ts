import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";
import { withErrorHandler } from "../../../../../utils/withErrorHandler.ts";
import { exportEchsmsService } from "../../../../../services/csms/contract/export-echsms.service.ts";

const paramsSchema = Type.Object({
  contractId: Type.String({ format: "uuid" }),
  folderId: Type.String({ format: "uuid" }),
});

const exportEchsmsRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: "GET",
    url: "/export-echsms/:contractId/:folderId",
    schema: {
      tags: ["CSMS Contract"],
      summary: "Export E-CHSMS evaluation spreadsheet",
      description: "Generate and download E-CHSMS Excel for a contract evaluation folder",
      params: paramsSchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
        404: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
        500: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      const { contractId, folderId } = req.params as { contractId: string; folderId: string };

      try {
        const result = await exportEchsmsService(contractId, folderId);

        if (!result) {
          return reply.status(404).send({
            success: false,
            message: req.i18n.t("user.csms.contract.notFound") || "Contract or folder not found",
          });
        }

        reply
          .header(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          )
          .header("Content-Disposition", `attachment; filename="${result.filename}"`)
          .send(result.buffer);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return reply.status(500).send({
          success: false,
          message: `Failed to export E-CHSMS Excel: ${errorMessage}`,
        });
      }
    }),
  });
};

export default exportEchsmsRoute;
