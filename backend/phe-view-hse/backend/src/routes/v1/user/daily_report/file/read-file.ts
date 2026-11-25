import { Type } from '@sinclair/typebox';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { withErrorHandler } from '../../../../../utils/withErrorHandler.ts';
import { msgFileReader, msgInfoToHtml } from '../../../../../services/reader_file-service.ts';

const SuccessResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Optional(Type.Any()),
  meta: Type.Optional(Type.Any()),
});

const ErrorResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String()
});

const readFileRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.post('/read-file', {
    schema: {
      tags: ['File'],
      summary: 'Upload .msg file and return parsed HTML',
      consumes: ['multipart/form-data'],
      response: {
        200: SuccessResponse,
        400: ErrorResponse,
        500: ErrorResponse
      }
    },
    handler: withErrorHandler(async (req, reply) => {
      const file = await req.file();

      if (!file) {
        return reply.status(400).send({
          success: false,
          message: req.i18n.t('user.dailyReport.file.noFilesUploaded')
        });
      }

      const uploaded = {
        buffer: await file.toBuffer(),
        filename: file.filename,
        mimetype: file.mimetype,
      };

      try {
        const msgInfo = await msgFileReader(uploaded);
        const { header, body, attachments } = msgInfoToHtml(msgInfo);
        return reply.status(200).type('application/json').send({
          success: true,
          message: req.i18n.t('user.dailyReport.file.msgFileParsed'),
          data: { header, body, attachments }
        });
      } catch (err: any) {
        return reply.status(500).type('application/json').send({
          success: false,
          message: err.message || req.i18n.t('user.dailyReport.file.msgFileParseFailed')
        });
      }
    }),
  });
};

export default readFileRoute;