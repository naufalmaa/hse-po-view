import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { withErrorHandler } from "../../../../../../utils/withErrorHandler.ts";
import { Type } from '@sinclair/typebox';
import { deleteFolder } from "../../../../../../services/csms/contract/folder.service.ts";
import { db } from "../../../../../../db/index.ts";
import { contractFolder } from "../../../../../../db/schema/csms.schema.ts";
import { eq } from "drizzle-orm";

const deleteFolderRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'DELETE',
    url: '/delete-folder',
    schema: {
      tags: ['CSMS Contract'],
      summary: 'Delete folder',
      description: 'Delete a folder and all its associated files and subfolders recursively',
      querystring: Type.Object({
        folderId: Type.String({ format: 'uuid' }),
      }),
      response: {
        200: Type.Any(),
        400: Type.Any(),
        500: Type.Any(),
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      try {
        const { folderId } = req.query as { folderId: string };

        if (!folderId) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.folder.folderIdRequired'),
          });
        }

        // First, get the folder to check its type
        const folder = await db.query.contractFolder.findFirst({
          where: eq(contractFolder.id, folderId)
        });

        if (!folder) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.folder.folderNotFound'),
          });
        }

        // Check if this is a K3LL structure folder (protected from deletion)
        const isK3LLFolder = folder.name === 'A. RENCANA K3LL' || 
                            /^([1-8])\s/.test(folder.name) || 
                            /^([1-8])\.(\d+)/.test(folder.name);
        if (isK3LLFolder) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.folder.cannotDeleteK3LLFolder') || 'Folder struktur standar K3LL tidak dapat dihapus.',
          });
        }

        // Check if root assessment folder is finalized
        let currentAncestor = folder;
        while (currentAncestor.parentId) {
          const parent = await db.query.contractFolder.findFirst({
            where: eq(contractFolder.id, currentAncestor.parentId)
          });
          if (!parent) break;
          currentAncestor = parent;
        }
        if (currentAncestor.isFinal) {
          return reply.status(400).send({
            success: false,
            message: 'Folder penilaian sudah difinalisasi. Folder di dalamnya tidak dapat dihapus.',
          });
        }

        // Delete the folder and all its contents
        const result = await deleteFolder(folderId);
        
        return reply.status(200).send({
          success: true,
          message: req.i18n.t('user.csms.contract.folder.folderDeleted'),
          data: result
        });
      } catch (error: any) {
        const isClientError = error.message?.includes('tidak dapat') || 
                              error.message?.includes('difinalisasi') || 
                              error.message?.includes('not found');
        return reply.status(isClientError ? 400 : 500).send({
          success: false,
          message: error.message || req.i18n.t('user.csms.contract.folder.folderDeleteFailed'),
        });
      }
    }),
  });
};

export default deleteFolderRoutes;