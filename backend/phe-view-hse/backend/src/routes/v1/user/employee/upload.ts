import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { uploadEmployeeFilesService } from '../../../../services/employee/upload.service.ts';
import type { UploadedFile } from '../../../../types/file.ts';
import { Type } from '@sinclair/typebox';

const SuccessResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Optional(Type.Any())
});

const ErrorResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String()
});

const uploadFileRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'POST',
    url: '/upload-file',
    schema: {
      summary: 'Upload file for employee general',
      tags: ['Employee'],
      consumes: ['multipart/form-data'],
      response: {
        200: SuccessResponse,
        400: ErrorResponse,
        500: ErrorResponse
      }
    },
    handler: withErrorHandler(async (req, reply) => {
      const parts = req.parts();
      const files: UploadedFile[] = [];
      const fields: Record<string, string> = {};

      for await (const part of parts) {
        if (part.type === 'file') {
          const buffer = await part.toBuffer();
          files.push({
            buffer,
            filename: part.filename,
            mimetype: part.mimetype,
          });
        } else {
          fields[part.fieldname ] = part.value as string;
        }
      }

      const employeeId = fields.employeeId;
      const relatedId = fields.relatedId;
      const type = fields.type;

      if (!employeeId || files.length === 0) {
        return reply.code(400).send({
          success: false,
          message: req.i18n.t('user.employee.invalidRequest'),
        });
      }

      try {
        const result = await uploadEmployeeFilesService({
          employeeId,
          files,
          type,
          relatedId,
        });

        return reply.send({
          success: true,
          message: req.i18n.t('user.employee.employeeFileUploaded'),
          data: result,
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: req.i18n.t('user.employee.employeeFileUploadFailed')
        });
      }
    }),
  });
};

export default uploadFileRoute;