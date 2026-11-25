import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";
import { withErrorHandler } from "../../../../../utils/withErrorHandler.ts";
import { sendEvaluasiReportEmail } from "../../../../../services/csms/contract/send-evaluasi-email.service.ts";

const sendEmailSchema = Type.Object({
  contractId: Type.String({ format: "uuid" }),
  folderId: Type.String({ format: "uuid" }),
  recipientUserIds: Type.Array(Type.String({ format: "uuid" }), {
    description: "List of user IDs to send the evaluation report to"
  }),
});

const sendEmailRoute: FastifyPluginAsyncTypebox = async (app) => {
  // Route: Send evaluation report via email
  app.route({
    method: "POST",
    url: "/send-evaluasi-email",
    schema: {
      tags: ["CSMS Contract"],
      summary: "Send evaluation report via email",
      description: "Generate and send evaluation report PDF to specified user IDs",
      body: sendEmailSchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
        404: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
        400: Type.Object({
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
      const { contractId, folderId, recipientUserIds } = req.body as {
        contractId: string;
        folderId: string;
        recipientUserIds: string[];
      };

      // Validate recipient user IDs
      if (!recipientUserIds || recipientUserIds.length === 0) {
        return reply.status(400).send({
          success: false,
          message: "At least one recipient user ID is required",
        });
      }

      try {
        // Send evaluation report via email
        await sendEvaluasiReportEmail({
          contractId,
          folderId,
          recipientUserIds,
        });

        return reply.status(200).send({
          success: true,
          message: `Evaluation report sent successfully to ${recipientUserIds.length} recipient(s)`,
        });
      } catch (error: any) {
        console.error("Error sending evaluation report email:", error);
        const message = error.response?.data?.message || (error instanceof Error ? error.message : "Failed to send evaluation report email");
        
        if (message === "Evaluation data not found") {
          return reply.status(404).send({
            success: false,
            message: req.i18n.t("user.csms.contract.notFound") || "Contract not found",
          });
        }
        
        return reply.status(500).send({
          success: false,
          message,
        });
      }
    }),
  });
};

export default sendEmailRoute;
