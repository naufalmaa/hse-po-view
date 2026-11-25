import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { withErrorHandler } from "../../../../../../utils/withErrorHandler.ts";
import { Type } from '@sinclair/typebox';
import { db } from "../../../../../../db/index.ts";
import { contractFolder } from "../../../../../../db/schema/csms.schema.ts";
import { eq } from "drizzle-orm";
import { getFullContractFileUrl } from "../../../../../../utils/document-utils.ts";

const getFileDetailsRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'GET',
    url: '/file-details',
    schema: {
      tags: ['CSMS Contract'],
      summary: 'Get file details',
      description: 'Get details for a specific file by folder ID',
      querystring: Type.Object({
        folderId: Type.String({ format: 'uuid' }),
      }),
    },
    handler: withErrorHandler(async (req, reply) => {
      const { folderId } = req.query as { folderId?: string };

      try {
        if (!folderId) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.file.folderIdRequired'),
          });
        }

        // Get the file details
        const file = await db.query.contractFolder.findFirst({
          where: eq(contractFolder.id, folderId)
        });

        if (!file) {
          return reply.status(404).send({
            success: false,
            message: req.i18n.t('user.csms.contract.file.fileNotFound'),
          });
        }

        // Get the depth 0 folder ID by fetching all folders for this contract
        // and finding the one that matches the hierarchy
        let depth0FolderId = file.id;
        if (file.depth !== 0) {
          // Get all folders for this contract
          const allFolders = await db.query.contractFolder.findMany({
            where: eq(contractFolder.contractId, file.contractId),
            columns: {
              id: true,
              parentId: true,
              depth: true,
            },
          });

          // Find depth 0 folder by traversing up the hierarchy
          let currentParentId: string | null = file.parentId;
          while (currentParentId) {
            const parentFolder = allFolders.find((f) => f.id === currentParentId);
            if (!parentFolder) break;
            if (parentFolder.depth === 0) {
              // Found the depth 0 folder
              depth0FolderId = parentFolder.id;
              break;
            }
            currentParentId = parentFolder.parentId;
          }
        }

        // Return file details with complete URL
        const finalUrl = file.filePath ? getFullContractFileUrl(file.id, file.filePath) : '';

        return reply.status(200).send({
          success: true,
          message: req.i18n.t('user.csms.contract.file.fileDetailsRetrieved'),
          data: {
            id: file.id,
            name: file.name,
            filePath: file.filePath,
            fileType: file.fileType,
            folderId: depth0FolderId,
            contractId: file.contractId,
            url: finalUrl,
          },
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: error.message || req.i18n.t('user.csms.contract.file.fileNotFound'),
        });
      }
    }),
  });
};

export default getFileDetailsRoutes;