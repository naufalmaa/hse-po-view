import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { withErrorHandler } from "../../../../../../utils/withErrorHandler.ts";
import { Type } from '@sinclair/typebox';
import { deleteContractFile } from "../../../../../../services/csms/contract/delete.service.ts";

const deleteFileRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'DELETE',
    url: '/delete-file',
    schema: {
      tags: ['CSMS Contract'],
      summary: 'Delete file',
      description: 'Delete a file from a contract folder',
      querystring: Type.Object({
        fileId: Type.String({ format: 'uuid' }),
      }),
      response: {
        200: Type.Any(),
        400: Type.Any(),
        500: Type.Any(),
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      try {
        const { fileId } = req.query as { fileId: string };

        if (!fileId) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.file.folderIdRequired'),
          });
        }

        // Delete the file
        const result = await deleteContractFile(fileId);
        
        // Since deleteContractFile either succeeds or throws, we can assume success here
        return reply.status(200).send({
          success: true,
          message: req.i18n.t('user.csms.contract.file.fileDeleted'),
          data: result
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: error.message || req.i18n.t('user.csms.contract.file.fileDeleteFailed'),
        });
      }
    }),
  });
};

export default deleteFileRoutes;