import { Type } from '@sinclair/typebox';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { deleteFilesByIds } from '../../../../../services/daily-report/files/delete.service.ts';
import {withErrorHandler} from "../../../../../utils/withErrorHandler.ts";

const DeleteFilesBody = Type.Object({
  ids: Type.Array(Type.String({ format: 'uuid' }), {
    minItems: 1,
    description: 'List of files IDs to delete',
  }),
});

const SuccessResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Optional(Type.Any())
});

const ErrorResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String()
});

const deleteFilesRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'DELETE',
    url: '/',
    schema: {
      tags: ['Daily Report'],
      summary: 'Delete multiple files by IDs',
      body: DeleteFilesBody,
      response: {
        200: SuccessResponse,
        500: ErrorResponse
      }
    },
    handler: withErrorHandler(async (req, reply) => {

      try{
        const { ids } = req.body as { ids: string[] };
        const result = await deleteFilesByIds(ids);
       return reply.status(200).send({ 
          success: true,
          message: req.i18n.t('user.dailyReport.file.filesDeleted'),
          data: result.deletedIds
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: req.i18n.t('user.dailyReport.file.filesDeleteFailed')
        });
      }
    }),
  });
};

export default deleteFilesRoute;