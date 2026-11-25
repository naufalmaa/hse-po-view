import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { importEmployeesFromExcelService } from '../../../../services/employee/import-excel.service.ts';

const importEmployeeExcelRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'POST',
    url: '/import-excel',
    schema: {
      tags: ['Employee'],
      summary: 'Import employees from Excel file',
      consumes: ['multipart/form-data'],
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({
            totalRows: Type.Number(),
            insertedRows: Type.Number(),
            errorRows: Type.Number(),
            errors: Type.Optional(Type.Array(Type.Any())),
          }),
        }),
        400: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
        403: Type.Object({
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
      // Check if multipart is available
      if (typeof req.parts !== 'function') {
        return reply.status(400).send({
          success: false,
          message: req.i18n.t('user.employee.employeeFileUploadFailed'),
        });
      }

      // Process the Excel file
      const result = await importEmployeesFromExcelService(req.parts(), req.i18n.t);

      return reply.code(200).send({
        success: true,
        message: req.i18n.t('user.employee.employeeImportCompleted'),
        data: result,
      });
    }),
  });
};

export default importEmployeeExcelRoute;