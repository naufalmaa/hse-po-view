import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { withErrorHandler } from "../../../../../../utils/withErrorHandler.ts";
import { Type } from '@sinclair/typebox';
import { updateFolderFinalStatus } from "../../../../../../services/csms/contract/update-folder-final-status.service.ts";
import { db } from "../../../../../../db/index.ts";
import { contractFolder } from "../../../../../../db/schema/csms.schema.ts";
import { eq } from "drizzle-orm";

const bodySchema = Type.Object({
  folderId: Type.String({ format: 'uuid' }),
  isFinal: Type.Boolean(),
});

const updateFolderFinalStatusRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/update-folder-final-status',
    method: 'POST',
    schema: {
      tags: ['CSMS Contract'],
      summary: 'Update folder final status',
      description: 'Update the final status of a depth 0 folder. When set to true, all children will have editing disabled.',
      body: bodySchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({
            id: Type.String({ format: 'uuid' }),
            name: Type.String(),
            isFinal: Type.Boolean(),
          }),
        }),
        400: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        }),
        403: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        }),
        500: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        })
      }
    },
    handler: withErrorHandler(async (req, reply) => {
      const { folderId, isFinal } = req.body as {
        folderId: string;
        isFinal: boolean;
      };

      try {
        // Validate input
        if (!folderId) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.folder.folderIdRequired'),
          });
        }

        // Re-opening a finalized folder is admin only (with a reason, via /definalize-folder)
        if (isFinal === false && (req as any).session?.user?.role !== 'admin') {
          return reply.status(403).send({
            success: false,
            message: 'Hanya admin yang dapat membuka finalisasi penilaian',
          });
        }

        // Update folder final status
        const updatedFolder = await updateFolderFinalStatus(folderId, isFinal);
        
        // Get the isFinal value from the database
        const folderRecord = await db.query.contractFolder.findFirst({
          where: eq(contractFolder.id, folderId),
        });

        return reply.status(200).send({
          success: true,
          message: req.i18n.t('user.csms.contract.folder.folderFinalStatusUpdated'),
          data: {
            id: updatedFolder.id,
            name: updatedFolder.name,
            isFinal: folderRecord?.isFinal || false,
          },
        });
      } catch (error: any) {
        if (error.message.includes("not found")) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.folder.folderNotFound'),
          });
        }
        
        if (error.message.includes("Only depth 0 folders")) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.folder.onlyDepth0Allowed'),
          });
        }
        
        if (error.message.includes("must be complete")) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.folder.folderNotComplete'),
          });
        }

        return reply.status(500).send({
          success: false,
          message: error.message || req.i18n.t('user.csms.contract.folder.folderFinalStatusUpdateFailed'),
        });
      }
    })
  });
};

export default updateFolderFinalStatusRoutes;