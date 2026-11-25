import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { withErrorHandler } from '../../../../../../utils/withErrorHandler.ts';
import { Type } from '@sinclair/typebox';
import { sendRejectRevisionNotification } from '../../../../../../services/csms/contract/reject-revision-notification.service.ts';

const bodySchema = Type.Object({
  contractFolderId: Type.String({ format: 'uuid' }),
});

const rejectRevisionRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/reject-folder-revision',
    method: 'POST',
    schema: {
      tags: ['CSMS Contract'],
      summary: 'Send folder status notification',
      description: 'Send notification when folder status changes to reject or revision',
      body: bodySchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          alarmId: Type.String({ format: 'uuid' }),
          folderId: Type.String({ format: 'uuid' }),
          contractId: Type.String({ format: 'uuid' }),
          status: Type.String(),
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
      const { contractFolderId } = req.body as {
        contractFolderId: string;
      };

      try {
        // Validate input
        if (!contractFolderId) {
          return reply.status(400).send({
            success: false,
            message: 'Contract folder ID is required',
          });
        }

        // Send reject revision notification
        const result = await sendRejectRevisionNotification(contractFolderId);

        return reply.status(200).send({
          success: true,
          message: result.message,
          alarmId: result.alarmId,
          folderId: result.folderId,
          contractId: result.contractId,
          status: result.status,
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: error.message || 'Failed to send reject revision notification',
        });
      }
    }),
  });
};

export default rejectRevisionRoutes;
