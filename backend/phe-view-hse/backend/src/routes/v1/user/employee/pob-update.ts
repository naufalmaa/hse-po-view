import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { pobUpdateService } from '../../../../services/employee/pob-update.service.ts';
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

const pobUpdateRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'POST',
    url: '/pob-update',
    schema: {
      summary: 'Upload POB Excel to update statusOnDuty',
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
      let excelBuffer: Buffer | null = null;
      let filename: string | undefined;
      const fields: Record<string, string> = {};

      for await (const part of parts) {
        if (part.type === 'file') {
          excelBuffer = await part.toBuffer();
          filename = part.filename;
        } else {
          fields[part.fieldname] = part.value as string;
        }
      }

      if (!excelBuffer) {
        return reply.code(400).send({
          success: false,
          message: 'No Excel file provided',
        });
      }

      const updates = (fields.updates || fields.Updates) === 'true' || (fields.updates || fields.Updates) === '1';
      const category = fields.category || fields.Category;

      try {
        const result = await pobUpdateService(excelBuffer, updates, category, filename);

        return reply.send({
          success: true,
          message: updates ? req.i18n.t('user.employee.pobUpdate') : req.i18n.t('user.employee.pobGrouping'),
          data: result,
        });
      } catch (error: any) {
        return reply.code(500).send({
          success: false,
          message: req.i18n.t('user.employee.pobUpdateFailed')
        });
      }
    }),
  });
};

export default pobUpdateRoute;
