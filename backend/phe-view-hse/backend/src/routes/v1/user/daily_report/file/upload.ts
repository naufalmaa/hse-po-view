import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { UploadFiles } from '../../../../../services/daily-report/files/upload.service.ts';
import {withErrorHandler} from "../../../../../utils/withErrorHandler.ts";

const SuccessResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Optional(Type.Any())
});

const ErrorResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String()
});

const uploadRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'POST',
    url: '/:reportId',
    schema: {
      consumes: ['multipart/form-data'],
      tags: ['Daily Report'],
      summary: 'Upload multiple files',
      params: Type.Object({
        reportId: Type.String({ format: 'uuid' }),
      }),
      response: {
        200: SuccessResponse,
        400: ErrorResponse,
        500: ErrorResponse
      }
    },

    handler: withErrorHandler(async (req, reply) => {
      const { reportId } = req.params as { reportId: string };
      const parts = req.parts();

      const files: {
        filename: string;
        mimetype: string;
        buffer: Buffer;
      }[] = [];

      const notes: string[] = [];
      let sectionType: string | undefined;

      for await (const part of parts) {
        if (part.type === 'file') {
          if (!part.filename || !part.mimetype) {
            return reply.code(400).send({
              success: false,
              message: req.i18n.t('user.dailyReport.file.invalidFilePart')
            });
          }

          const buffer = await part.toBuffer();
          files.push({ filename: part.filename, mimetype: part.mimetype, buffer });

        } else if (part.type === 'field') {
          if (part.fieldname === 'notes' && typeof part.value === 'string') {
            notes.push(part.value.trim());
          }
          if (part.fieldname === 'section' && typeof part.value === 'string') {
            const cleaned = part.value.trim();
            if (cleaned !== '') {
              sectionType = cleaned;
            }
          }
        }
      }

      if (!files.length) {
        return reply.code(400).send({
          success: false,
          message: req.i18n.t('user.dailyReport.file.noFilesUploaded')
        });
      }
      
      if (notes.length && notes.length !== files.length) {
        return reply.code(400).send({
          success: false,
          message: req.i18n.t('user.dailyReport.file.notesMismatch')
        });
      }

      while (notes.length < files.length) notes.push('');

      try {
        const result = await UploadFiles(files, notes, reportId, undefined, sectionType);
        return reply.status(200).send({
          success: true,
          message: req.i18n.t('user.dailyReport.file.filesUploaded'),
          data: result
        });
      } catch (error: any) {
        return reply.code(500).send({
          success: false,
          message: error.message || req.i18n.t('user.dailyReport.file.filesUploadFailed')
        });
      }
    }),
  });
};

export default uploadRoute;