import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";
import { withErrorHandler } from "../../../../../utils/withErrorHandler.ts";
import { exportEvaluasiToPDF } from "../../../../../services/csms/contract/send-evaluasi-email.service.ts";

const paramsSchema = Type.Object({
  contractId: Type.String({ format: "uuid" }),
  folderId: Type.String({ format: "uuid" }),
});

const exportEvaluasiRoute: FastifyPluginAsyncTypebox = async (app) => {
  // Route: Export evaluation as PDF (for download)
  app.route({
    method: "GET",
    url: "/export-evaluasi/:contractId/:folderId",
    schema: {
      tags: ["CSMS Contract"],
      summary: "Export contract evaluation results as PDF",
      description: "Generate and download Hasil Evaluasi (Evaluation Results) PDF for a contract",
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
        // Export evaluation as PDF
        const result = await exportEvaluasiToPDF({ contractId, folderId });

        if (!result) {
          return reply.status(404).send({
            success: false,
            message: req.i18n.t("user.csms.contract.notFound") || "Contract not found",
          });
        }

        // Set headers for PDF download
        reply
          .header("Content-Type", "application/pdf")
          .header(
            "Content-Disposition",
            `attachment; filename="${result.filename}"`
          )
          .send(result.pdfBuffer);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return reply.status(500).send({
          success: false,
          message: `${req.i18n.t("user.csms.contract.exportPdfFailed")}: ${errorMessage}`,
        });
      }
    }),
  });
};

export default exportEvaluasiRoute;
