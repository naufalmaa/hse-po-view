import { Type } from '@sinclair/typebox';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { updateFileNote } from '../../../../../services/daily-report/files/update.service.ts';
import { withErrorHandler } from '../../../../../utils/withErrorHandler.ts';

const SuccessResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Optional(Type.Any())
});

const ErrorResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String()
});

const updateNoteRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'PATCH',
    url: '/:fileId',
    schema: {
      tags: ['Daily Report'],
      summary: 'Update note for uploaded file',
      params: Type.Object({
        fileId: Type.String({ format: 'uuid' }),
      }),
      body: Type.Object({
        note: Type.String({ minLength: 1 }),
      }),
      response: {
        200: SuccessResponse,
        500: ErrorResponse
      }
    },
    handler: withErrorHandler(async (req, reply) => {
      try {
        const { fileId } = req.params as { fileId: string };
        const { note } = req.body as { note: string };

        const result = await updateFileNote(fileId, note);
    
        return reply.status(200).send({
          success: true,
          message: req.i18n.t('user.dailyReport.file.fileNoteUpdated'),
          data: result
        });
      }catch(error: any){
        return reply.status(500).send({
          success: false,
          message: req.i18n.t('user.dailyReport.file.fileNoteUpdateFailed')
        });
      }      
    }),
  });
};

export default updateNoteRoute;