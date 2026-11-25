import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { withErrorHandler } from "../../../../../../utils/withErrorHandler.ts";
import { Type } from '@sinclair/typebox';
import { uploadMultipleFilesToContractFolder } from "../../../../../../services/csms/contract/upload.service.ts";

const uploadFileToFolderRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'POST',
    url: '/upload-file-to-folder',
    bodyLimit: 100 * 1024 * 1024,
    schema: {
      tags: ['CSMS Contract'],
      summary: 'Upload file(s) to contract folder',
      description: 'Upload one or multiple files to a specific contract folder',
      consumes: ['multipart/form-data'],
      response: {
        200: Type.Any(),
        400: Type.Any(),
        500: Type.Any(),
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      try {
        // Parse multipart fields
        let folderId = '';
        let note = '';
        const files: { buffer: Buffer; mimetype: string; filename: string }[] = [];
        let currentBatchSize = 0;
        let batchSizeExceeded = false;
        let maxFilesExceeded = false;

        if (typeof req.parts === 'function') {
          for await (const part of req.parts()) {
            if (part.type === 'file') {
              if (files.length >= 25) {
                maxFilesExceeded = true;
                break;
              }
              // Handle both single file (file) and multiple files (files[])
              const buffer = await part.toBuffer();
              currentBatchSize += buffer.length;
              if (currentBatchSize > 100 * 1024 * 1024) {
                batchSizeExceeded = true;
                break;
              }
              files.push({
                buffer,
                mimetype: part.mimetype,
                filename: part.filename,
              });
            } else if (part.type === 'field') {
              if (part.fieldname === 'folderId' && typeof part.value === 'string') {
                folderId = part.value;
              } else if (part.fieldname === 'note' && typeof part.value === 'string') {
                note = part.value;
              }
            }
          }
        }

        if (maxFilesExceeded || files.length > 25) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.file.maxFilesExceeded'),
          });
        }

        if (batchSizeExceeded || currentBatchSize > 100 * 1024 * 1024) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.file.maxBatchSizeExceeded'),
          });
        }

        if (!folderId) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.file.folderIdRequired'),
          });
        }

        if (files.length === 0) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.file.noFilesUploaded'),
          });
        }
        else {
          const input = {
            folderId,
            files,
            note
          };

          // Upload multiple files to folder
          const result = await uploadMultipleFilesToContractFolder(input);
          
          if (result.success) {
            return reply.status(200).send({
              success: true,
              message: req.i18n.t('user.csms.contract.file.fileUploaded'),
              data: result.data
            });
          } else {
            return reply.status(500).send({
              success: false,
              message: req.i18n.t('user.csms.contract.file.fileUploadFailed'),
            });
          }
        }
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: error.message || req.i18n.t('user.csms.contract.file.fileUploadFailed'),
        });
      }
    }),
  });
};

export default uploadFileToFolderRoutes;