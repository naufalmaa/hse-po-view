import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { withErrorHandler } from "../../../../../../utils/withErrorHandler.ts";
import { Type } from '@sinclair/typebox';
import { db } from "../../../../../../db/index.ts";
import { contractFolder } from "../../../../../../db/schema/csms.schema.ts";
import { eq } from "drizzle-orm";
import { updateFolderNoteContractor, isK3LLStructureFolder } from "../../../../../../services/csms/contract/folder.service.ts";

const bodySchema = Type.Object({
  folderId: Type.String({ format: 'uuid' }),
  name: Type.Optional(Type.String()), // Make name optional
  description: Type.Optional(Type.String()), // Make description optional
  noteContractor: Type.Optional(Type.String()), // Note from contractor role only
});

const updateFolderRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/update-folder',
    method: 'POST',
    schema: {
      tags: ['CSMS Contract'],
      summary: 'Update folder name, description, or contractor note',
      description: 'Update the name, description, or contractor note of a folder. Only contractors can update note_contractor field.',
      body: bodySchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
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
      const { folderId, name, description, noteContractor } = req.body as {
        folderId: string;
        name?: string;
        description?: string;
        noteContractor?: string;
      };

      const user = req.session.user;

      try {
        // Validate input
        if (!folderId) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.folder.folderIdRequired'),
          });
        }

        // Check if folder exists
        const existingFolder = await db.query.contractFolder.findFirst({
          where: eq(contractFolder.id, folderId),
        });

        if (!existingFolder) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.folder.folderNotFound'),
          });
        }

        // Check if root assessment folder is finalized
        let currentAncestor = existingFolder;
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
            message: 'Folder penilaian sudah difinalisasi. Folder di dalamnya tidak dapat diubah.',
          });
        }

        // Prevent renaming standard K3LL structure folders
        if (name !== undefined && name !== existingFolder.name && isK3LLStructureFolder(existingFolder.name)) {
          return reply.status(400).send({
            success: false,
            message: 'Folder struktur standar K3LL tidak dapat diubah namanya.',
          });
        }

        // Only contractor role can update noteContractor field
        if (noteContractor !== undefined && user.role !== 'contractor') {
          return reply.status(403).send({
            success: false,
            message: req.i18n.t('user.csms.contract.folder.onlyContractorCanUpdateNote'),
          });
        }

        // Handle noteContractor update separately if provided
        if (noteContractor !== undefined) {
          const result = await updateFolderNoteContractor(folderId, noteContractor, undefined, user.id);
          return reply.status(200).send({
            success: true,
            message: req.i18n.t('user.csms.contract.folder.folderUpdated'),
            data: result,
          });
        }

        // Prepare update data for name and/or description
        const updateData: any = {
          updatedAt: new Date(),
        };
        
        // Add name if provided
        if (name !== undefined) {
          updateData.name = name;
        }
        
        // Add description if provided
        if (description !== undefined) {
          updateData.description = description;
        }

        // Ensure at least one field is being updated
        if (Object.keys(updateData).length <= 1) { // Only updatedAt is present
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.folder.nameOrDescriptionRequired'),
          });
        }

        // Update folder name and/or description
        await db.update(contractFolder).set(updateData).where(eq(contractFolder.id, folderId));

        return reply.status(200).send({
          success: true,
          message: req.i18n.t('user.csms.contract.folder.folderUpdated'),
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: error.message || req.i18n.t('user.csms.contract.folder.folderUpdateFailed'),
        });
      }
    })
  });
};

export default updateFolderRoutes;