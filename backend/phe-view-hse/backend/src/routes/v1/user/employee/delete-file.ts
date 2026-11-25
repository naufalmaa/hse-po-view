import {type Static, Type} from '@sinclair/typebox';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import {withErrorHandler} from "../../../../utils/withErrorHandler.ts";
import {deleteFile} from "../../../../services/employee/delete.service.ts";

export const FileSchema = Type.Object({
  fileId: Type.Union([
    Type.String(),
    Type.Array(Type.String())
  ]),
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

type FileType = Static<typeof FileSchema>;

const deleteFileRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'POST',
    url: '/delete-file',
    schema: {
      tags: ['Employee'],
      summary: 'Delete uploaded file(s) by file ID(s)',
      body: FileSchema,
      response: {
        200: SuccessResponse,
        400: ErrorResponse,
        500: ErrorResponse
      }
    },
    handler: withErrorHandler(async (req, reply) => {
      try {
        const result = await deleteFile(req.body as FileType);

        return reply.status(200).send({ 
          success: true,
          message: req.i18n.t('user.employee.employeeFileDeleted'),
          data: result.fileId
        });

      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: req.i18n.t('user.employee.employeeFileDeleteFailed')
        });
      }
    }),
  });
};

export default deleteFileRoute;