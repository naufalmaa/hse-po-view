import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { processFileUpload, type FilePart } from '../../../../services/smartCardObservations/upload-handler.service.ts';

// Helper function to convert Fastify's multipart part to our FilePart interface
async function* convertToFileParts(parts: AsyncIterable<any>): AsyncIterable<FilePart> {
  for await (const part of parts) {
    if (part.type === 'file') {
      yield {
        type: part.type,
        filename: part.filename,
        mimetype: part.mimetype,
        toBuffer: () => part.toBuffer(),
      };
    }
  }
}

const uploadObservationsRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'POST',
    url: '/upload-observations',
    schema: {
      consumes: ['multipart/form-data'],
      tags: ['Smart Card'],
      summary: 'Upload Smart Card Observations Excel file',
      description: 'Upload one or multiple Excel files with smart card observations data. Processes "data-online" sheet and filters for "Production Operations" department. Returns simplified results list - use error validation endpoints for detailed error handling.',
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          results: Type.Array(Type.Object({
            filename: Type.String(),
            status: Type.Union([Type.Literal('success'), Type.Literal('error')]),
            uploadHistoryId: Type.Optional(Type.String()), // Add upload history ID
            summary: Type.Optional(Type.Object({
              totalRows: Type.Number(),
              validRows: Type.Number(),
              errorRows: Type.Number(),
              skippedRows: Type.Number(),
              insertedRows: Type.Number(),
            })),
            error: Type.Optional(Type.String()),
          })),
          hasErrors: Type.Boolean(),
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
        const parts = req.parts();
        const fileParts = convertToFileParts(parts);
        const user = req.session.user;
        const result = await processFileUpload(fileParts, user.id);
        return reply.send({
          ...result,
          message: req.i18n.t('user.smartCard.fileUploaded')
        });
      } catch (error) {
        throw error;
      }
    }),
  });
};

export default uploadObservationsRoute;