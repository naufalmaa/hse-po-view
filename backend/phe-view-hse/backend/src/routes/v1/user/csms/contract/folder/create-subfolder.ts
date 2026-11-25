import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { withErrorHandler } from "../../../../../../utils/withErrorHandler.ts";
import { Type } from '@sinclair/typebox';
import { createSubfolder } from "../../../../../../services/csms/contract/folder.service.ts";

const createSubfolderRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'POST',
    url: '/create-subfolder',
    schema: {
      tags: ['CSMS Contract'],
      summary: 'Create subfolder',
      description: 'Create a subfolder under a parent folder',
      body: Type.Object({
        parentFolderId: Type.String(),
        folderName: Type.String(),
        description: Type.Optional(Type.String()),
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Any()
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
      try {
        const { parentFolderId, folderName, description = '' } = req.body as {
          parentFolderId: string;
          folderName: string;
          description?: string;
        };

        if (!parentFolderId) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.subfolderCreateFailed') + ': parentFolderId is required',
          });
        }

        if (!folderName) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.subfolderCreateFailed') + ': folderName is required',
          });
        }
        
        // Create the subfolder
        const newFolder = await createSubfolder(parentFolderId, folderName, description);
        
        return reply.status(200).send({
          success: true,
          message: req.i18n.t('user.csms.contract.subfolderCreated'),
          data: newFolder
        });
      } catch (error: any) {
        const isClientError = error.message?.includes('Tidak dapat') || 
                              error.message?.includes('difinalisasi') || 
                              error.message?.includes('not found');
        return reply.status(isClientError ? 400 : 500).send({
          success: false,
          message: error.message || req.i18n.t('user.csms.contract.subfolderCreateFailed'),
        });
      }
    }),
  });
};

export default createSubfolderRoutes;