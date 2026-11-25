import { Type } from '@sinclair/typebox';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import {withErrorHandler} from "../../../../utils/withErrorHandler.ts";
import { updateDailyReport } from '../../../../services/daily-report/update.service.ts';
import {
  MeetingSchema, DrillSchema, TrainingSchema, PermitSchema,
} from '../../../../schema/report.schema.ts';
import {castFieldsWithSchema} from "../../../../utils/cast.ts";

const SuccessResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Any(),
});

const ErrorResponse = Type.Object({ 
  success: Type.Optional(Type.Boolean()),
  message: Type.String() 
});

const updateDailyReportRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'PUT',
    url: '/update-with-upload/:id',
    schema: {
      tags: ['Daily Report'],
      summary: 'Update with File Upload',
      consumes: ['multipart/form-data'],
      params: Type.Object({
        id: Type.String({ format: 'uuid' }),
      }),
      response: {
        200: SuccessResponse,
        400: ErrorResponse,
      },
    },
    handler: withErrorHandler(async (req, reply) => {

      const user = req.session.user;

      const role = user.role;
      if (!role || !['admin', 'user', 'crew', 'contractor'].includes(role)) {
        return reply.status(400).send({ 
          success: false,
          message: req.i18n.t('user.dailyReport.report.unauthorizedRole')
        });
      }

      const { id: reportId } = req.params as { id: string };

      // === Parse multipart ===
      const rawFields: Record<string, any> = {};
      const filesMap: Record<string, {
        buffer: Buffer;
        filename: string;
        mimetype: string;
        fieldname: string;
      }> = {};

      if (typeof req.parts === 'function') {
        for await (const part of req.parts()) {
          if (part.type === 'file') {
            if (part.file.truncated) {
              return reply.status(400).send({
                success: false,
                message: req.i18n.t('user.dailyReport.report.fileTooLarge')
              });
            }

            const buffer = await part.toBuffer();

            filesMap[part.fieldname] = {
              buffer,
              filename: part.filename,
              mimetype: part.mimetype,
              fieldname: part.fieldname,
            };
          } else if (part.type === 'field') {
            try {
              const val = part.value;
              const isJson = typeof val === 'string' && ['{', '['].includes(val.trim()[0]);
              rawFields[part.fieldname] = isJson ? JSON.parse(val) : val;
            } catch (err) {
              rawFields[part.fieldname] = part.value;
            }
          }
        }
      }
      
      // Restructure the data to match the expected format
      // Extract daily report fields that should be at the root level
      const dailyReportFields = ['reportDate', 'reportedBy', 'instansi'];
      
      for (const field of dailyReportFields) {
        if (rawFields[field] !== undefined) {
          // Move daily report fields to the correct structure
          rawFields[field] = rawFields[field];
        }
      }
      
      // The payload is the rawFields with proper structure
      const multipartPayload = { ...rawFields };

      // === Cast per section
      const sectionSchemas = {
        meeting: MeetingSchema,
        drill: DrillSchema,
        training: TrainingSchema,
        permit: PermitSchema,
      };

      for (const [sectionKey, schema] of Object.entries(sectionSchemas)) {
        const section = rawFields[sectionKey];

        if (section && typeof section === 'object') {
          if (Array.isArray(section.files)) {
            section.files = section.files.map((f: any) => ({
              file: f.file,
              note: f.note ?? '',
            }));
          }

          rawFields[sectionKey] = castFieldsWithSchema(section, schema);
        }
      }

      try {
        const result = await updateDailyReport(
          reportId,
          multipartPayload,
          role as 'admin' | 'user' | 'crew',
          filesMap
        );

        if ('error' in result) {
          return reply.status(400).send({
            success: false,
            message: result.error
          });
        }

        return reply.status(200).send({
          success: true,
          message: req.i18n.t('user.dailyReport.report.dailyReportUpdated'),
          data: result
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: error.message || req.i18n.t('user.dailyReport.report.dailyReportUpdateFailed')
        });
      }
    }),
  });
  // app.route({
  //   method: 'PUT',
  //   url: '/:id',
  //   schema: {
  //     tags: ['Daily Report'],
  //     summary: 'Update',
  //     params: Type.Object({
  //       id: Type.String({ format: 'uuid' }),
  //     }),
  //       body: Type.Union([
  //       UpdateProjectFormSchema,
  //       UpdateMarineFormSchema,
  //       UpdateContractorMarineFormSchema,
  //     ], {
  //       description: 'Union schema for all form types',
  //       examples: [
  //         ...UpdateProjectFormSchema.examples ?? [],
  //         ...UpdateMarineFormSchema.examples ?? [],
  //         ...UpdateContractorMarineFormSchema.examples ?? []
  //       ]
  //     }),
  //     response: {
  //       200: SuccessResponse,
  //       400: ErrorResponse,
  //     },
  //   },
  //   handler: withErrorHandler(async (req, reply) => {

  //     const user = req.session.user;
  //     const { id: reportId } = req.params as { id: string };
  //     const { role } = user;

  //     if (role !== 'admin' && role !== 'user' && role !== 'contractor') {
  //       return reply.status(401).send({ 
  //         success: false,
  //         message: req.i18n.t('user.dailyReport.report.unauthorizedRole')
  //       });
  //     }

  //     try {
  //       const result = await updateDailyReport(reportId, req.body, role);

  //       if ('error' in result) {
  //         return reply.status(400).send({
  //           success: false,
  //           message: req.i18n.t('user.dailyReport.report.dailyReportUpdateFailed')
  //         });
  //       }

  //       return reply.status(200).send({
  //         success: true,
  //         message: req.i18n.t('user.dailyReport.report.dailyReportUpdated'),
  //         data: result.data
  //       });
  //     } catch (error: any) {
  //       return reply.status(500).send({
  //         success: false,
  //         message: req.i18n.t('user.dailyReport.report.dailyReportUpdateFailed')
  //       });
  //     }
  //   }),
  // });
};

export default updateDailyReportRoute;