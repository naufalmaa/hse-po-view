import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";
import { withErrorHandler } from "../../../../../utils/withErrorHandler.ts";
import { getCatatanPerbaikanData, generateCatatanPerbaikanHTML } from "../../../../../services/csms/contract/export-catatan-perbaikan.service.ts";
import { htmlToPdf } from "../../../../../utils/htmlToPdf.ts";

const paramsSchema = Type.Object({
  contractId: Type.String({ format: "uuid" }),
  folderId: Type.String({ format: "uuid" }),
});

const exportCatatanPerbaikanRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: "GET",
    url: "/export-catatan-perbaikan/:contractId/:folderId",
    schema: {
      tags: ["CSMS Contract"],
      summary: "Export contract improvement notes as PDF",
      description: "Generate and download Catatan Perbaikan (Improvement Notes) PDF for a contract",
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
        // Get catatan perbaikan data for specific folder
        const catatanData = await getCatatanPerbaikanData(contractId, folderId);

        if (!catatanData) {
          return reply.status(404).send({
            success: false,
            message: req.i18n.t("user.csms.contract.notFound") || "Contract not found",
          });
        }

        // Generate HTML content
        const htmlContent = await generateCatatanPerbaikanHTML(catatanData);

        // Convert HTML to PDF
        const pdfBuffer = await htmlToPdf(htmlContent, {
          format: "A4",
          margin: "20px",
        });

        // Set headers for PDF download
        reply
          .header("Content-Type", "application/pdf")
          .header(
            "Content-Disposition",
            `attachment; filename="Catatan-Perbaikan-${catatanData.contractNumber}-${new Date().getTime()}.pdf"`
          )
          .send(pdfBuffer);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error generating catatan perbaikan PDF:", errorMessage);
        return reply.status(500).send({
          success: false,
          message: "Failed to generate catatan perbaikan PDF",
        });
      }
    }),
  });
};

export default exportCatatanPerbaikanRoute;
