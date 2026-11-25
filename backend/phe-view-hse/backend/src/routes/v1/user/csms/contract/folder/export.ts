import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { withErrorHandler } from "../../../../../../utils/withErrorHandler.ts";
import { Type } from '@sinclair/typebox';
import { exportFolderToZip } from "../../../../../../services/csms/contract/export-folder-zip.service.ts";

const paramsSchema = Type.Object({
  folderId: Type.String({ format: 'uuid' }),
});

const exportFolderRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/export-folder/:folderId',
    method: 'GET',
    schema: {
      tags: ['CSMS Contract'],
      summary: 'Export and download contract folder as ZIP file',
      description: 'Export a folder and all its contents to a ZIP file and return it for download. Automatically generates new ZIP if folder has been updated, otherwise returns the previously generated ZIP.',
      params: paramsSchema,
    },
    handler: withErrorHandler(async (req, reply) => {
      const { folderId } = req.params as { folderId: string };

      try {
        // Export folder to zip - automatically handles update detection
        // If folder has been updated, generates new ZIP and removes old one
        // If folder has not been updated, returns existing ZIP
        const exportResult = await exportFolderToZip(folderId);

        if (!exportResult.success) {
          return reply.status(500).send({
            success: false,
            message: req.i18n.t('user.csms.contract.folder.exportFailed'),
          });
        }

        // Get file size
        const fs = await import('fs/promises');
        const stats = await fs.stat(exportResult.zipPath);

        // Set response headers for file download
        reply.header('Content-Type', 'application/zip');
        reply.header('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
        reply.header('Content-Length', stats.size);

        // Send the file for download
        const { createReadStream } = await import('fs');
        const stream = createReadStream(exportResult.zipPath);
        
        return reply.send(stream);
      } catch (error: any) {
        if (error.message && error.message.includes('not found')) {
          return reply.status(404).send({
            success: false,
            message: req.i18n.t('user.csms.contract.folder.folderNotFound'),
          });
        }

        console.error(`Error exporting folder ${folderId}:`, error);
        return reply.status(500).send({
          success: false,
          message: error.message || req.i18n.t('user.csms.contract.folder.exportFailed'),
        });
      }
    }),
  });
};

export default exportFolderRoutes;
