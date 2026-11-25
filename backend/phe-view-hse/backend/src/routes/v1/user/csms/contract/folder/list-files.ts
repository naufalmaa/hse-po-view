import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { withErrorHandler } from "../../../../../../utils/withErrorHandler.ts";
import { Type } from '@sinclair/typebox';
import { getFilesForContractFolder } from "../../../../../../services/csms/contract/list.service.ts";
import { getFullContractFileUrl } from "../../../../../../utils/document-utils.ts";
import { isFolderStructureComplete, updateFolderCompletionStatus } from "../../../../../../services/csms/contract/folder-completion.service.ts";
import { db } from "../../../../../../db/index.ts";
import { contractFolder } from "../../../../../../db/schema/csms.schema.ts";
import { eq } from "drizzle-orm";

/**
 * Find the ancestor assessment folder (PB/PA/PSB) for a given folder.
 */
async function findAncestorAssessmentFolder(folderId: string): Promise<any> {
  let current = await db.query.contractFolder.findFirst({
    where: eq(contractFolder.id, folderId),
  });

  while (current) {
    const name = current.name || "";
    if (name.endsWith(" - PB") || name.endsWith(" - PA") || name.endsWith(" - PSB")) {
      return current;
    }
    if (!current.parentId) break;
    current = await db.query.contractFolder.findFirst({
      where: eq(contractFolder.id, current.parentId),
    });
  }
  return null;
}

const listFolderFilesRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'GET',
    url: '/folder-files',
    schema: {
      tags: ['CSMS Contract'],
      summary: 'List files in contract folder',
      description: 'List file information associated with a contract folder',
      querystring: Type.Object({
        folderId: Type.String({ format: 'uuid' }),
      }),
    },
    handler: withErrorHandler(async (req, reply) => {
      const { folderId } = req.query as { folderId: string };

      try {
        if (!folderId) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.folder.folderIdRequired'),
          });
        }

        // Find ancestor assessment folder (PB/PA) and update completion of all its descendants
        const ancestorFolder = await findAncestorAssessmentFolder(folderId);
        if (ancestorFolder) {
          const isPBorPA = ancestorFolder.name.endsWith(" - PB") || ancestorFolder.name.endsWith(" - PA");
          if (isPBorPA) {
            // Fetch all folders under this ancestor assessment folder
            const allFoldersInAssessment = await db.query.contractFolder.findMany({
              where: (fields, { sql, and, eq }) => and(
                eq(fields.fileType, 'folder'),
                sql`${fields.path} <@ ${ancestorFolder.path}::ltree`
              )
            });

            // Fetch all files under this ancestor assessment folder
            const allFilesInAssessment = await db.query.contractFolder.findMany({
              where: (fields, { sql, and, eq }) => and(
                eq(fields.fileType, 'file'),
                sql`${fields.path} <@ ${ancestorFolder.path}::ltree`
              )
            });

            // Find "A. RENCANA K3LL" folder
            const rencanaK3LL = allFoldersInAssessment.find(f => f.name === 'A. RENCANA K3LL');
            if (rencanaK3LL) {
              // Find the 8 root K3LL folders (direct children of "A. RENCANA K3LL" starting with 1-8)
              const elementFolders = allFoldersInAssessment.filter(f =>
                f.parentId === rencanaK3LL.id && /^([1-8])\s/.test(f.name)
              );

              // Gather all folders to check (elements 1-8 and their subfolders)
              const foldersToCheck = allFoldersInAssessment.filter(f =>
                elementFolders.some(el => f.path.startsWith(el.path))
              );

              // Helper function to check completion status in-memory
              const checkFolderCompletion = (folder: any) => {
                const childItems = [
                  ...allFoldersInAssessment.filter(f => f.parentId === folder.id),
                  ...allFilesInAssessment.filter(f => f.parentId === folder.id)
                ];

                if (childItems.length > 0) {
                  // Check if folder has numbered sub-folders (e.g. 4.1, 4.2)
                  const numberedChildren = childItems.filter(child =>
                    child.fileType === 'folder' && /^([1-8])\.\d+/.test(child.name)
                  );
                  if (numberedChildren.length > 0) {
                    for (const nc of numberedChildren) {
                      const hasFiles = allFilesInAssessment.some(f => f.path.startsWith(nc.path));
                      if (!hasFiles) {
                        return false;
                      }
                    }
                    return true;
                  }

                  // Otherwise, just check if there is at least one file
                  return allFilesInAssessment.some(f => f.path.startsWith(folder.path));
                } else {
                  // Leaf folder has no children/files
                  return false;
                }
              };

              // Check and update database if status changed
              for (const f of foldersToCheck) {
                const calculatedComplete = checkFolderCompletion(f);
                if (f.isComplete !== calculatedComplete) {
                  await updateFolderCompletionStatus(f.id, calculatedComplete);
                }
              }
            }
          }
        }

        // Update completion status for this folder
        const isComplete = await isFolderStructureComplete(folderId);
        await updateFolderCompletionStatus(folderId, isComplete);

        // Also update completion status for all direct children
        const children = await db.query.contractFolder.findMany({
          where: eq(contractFolder.parentId, folderId),
        });
        for (const child of children) {
          const childComplete = await isFolderStructureComplete(child.id);
          if (child.isComplete !== childComplete) {
            await updateFolderCompletionStatus(child.id, childComplete);
          }
        }

        // Update ancestor assessment folder (PB/PA) completion too
        if (ancestorFolder) {
          const ancestorComplete = await isFolderStructureComplete(ancestorFolder.id);
          if (ancestorFolder.isComplete !== ancestorComplete) {
            await updateFolderCompletionStatus(ancestorFolder.id, ancestorComplete);
          }
        }

        const files = await getFilesForContractFolder(folderId);
        
        // Transform the data to remove ID field as per specification and add secure URL
        const transformedFiles = files.map(file => ({
          fileName: file.fileName,
          filePath: file.filePath,
          fileType: file.fileType,
          folderId: file.folderId,
          url: file.filePath ? getFullContractFileUrl(file.folderId, file.filePath) : null,
        }));
        
        return reply.status(200).send({
          success: true,
          message: req.i18n.t('user.csms.contract.folder.filesListed'),
          data: {
            files: transformedFiles,
            isComplete,
          },
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: error.message || req.i18n.t('user.csms.contract.folder.fileListFailed'),
        });
        }
      }),
  });
};

export default listFolderFilesRoutes;