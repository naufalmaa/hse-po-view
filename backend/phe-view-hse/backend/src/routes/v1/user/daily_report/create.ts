import type {FastifyPluginAsyncTypebox} from '@fastify/type-provider-typebox';
import {CreateDailyFormSchema, type DailyFormType} from '../../../../schema/report.schema.ts';
import {createDailyReport} from '../../../../services/daily-report/create.service.ts';
import {withErrorHandler} from "../../../../utils/withErrorHandler.ts";
import { convertDeepTimestampsToWIB } from '../../../../utils/timezone.ts';

const addDailyReportProjectRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/create',
    method: 'POST',
    schema: {
      tags: ['Daily Report'],
      summary: 'Create',
      body: CreateDailyFormSchema,
    },
    handler: withErrorHandler(async (req, reply) => {
      
      const user = req.session.user;

      try {
        const data = await createDailyReport(req.body as DailyFormType, {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as 'admin' | 'user' | 'crew'
        });
        return reply.send({ 
          success: true, 
          message: req.i18n.t('user.dailyReport.report.dailyReportCreated'),
          data: convertDeepTimestampsToWIB(data)
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 400).send({
          success: false,
          message: error.message || req.i18n.t('user.dailyReport.report.dailyReportCreateFailed')
        });
      }
    }),
  });

  app.route({
    url: '/create-with-upload',
    method: 'POST',
    schema: {
      tags: ['Daily Report'],
      summary: 'Create with File Upload',
      consumes: ['multipart/form-data'],
    },
    handler: withErrorHandler(async (req, reply) => {

      const user = req.session.user;
      const rawRole = user?.role;
      const allowedRoles = ['admin', 'user', 'crew'] as const;
      if (!rawRole || !allowedRoles.includes(rawRole)) {
        return reply.status(400).send({ 
          success: false,
          message: req.i18n.t('user.dailyReport.report.unauthorizedRole')
        });
      }

      const role = rawRole as (typeof allowedRoles)[number];

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
                message: req.i18n.t('user.dailyReport.report.fileTooLarge'),
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

      // Validasi minimal field wajib
      const required = ['reportDate', 'reportedBy', 'instansi', 'formType'];
      for (const field of required) {
        if (!rawFields[field]) {
          return reply.status(400).send({ 
            success: false,
            message: req.i18n.t('user.dailyReport.report.missingRequiredField')
          });
        }
      }

      // Casting manual dan aman
      const formData: DailyFormType = {
        reportDate: rawFields.reportDate,
        reportedBy: rawFields.reportedBy,
        instansi: rawFields.instansi,
        formType: rawFields.formType,
        subtype: rawFields.subtype,
        workLocationId: rawFields.workLocationId,
        lagging: rawFields.lagging,
        manhours: rawFields.manhours,
        smartCard: rawFields.smartCard,
        meeting: rawFields.meeting,
        drill: rawFields.drill,
        training: rawFields.training,
        permit: rawFields.permit,
        highlight: rawFields.highlight,
        operations: rawFields.operations,
        inspections: rawFields.inspections,
        vesselsUnderPOSummary: rawFields.vesselsUnderPOSummary,
      };

      try {
        const result = await createDailyReport(formData, {
          id: user.id,
          name: user.name,
          email: user.email,
          role,
          files: filesMap,
        });

        return reply.send({ 
          success: true, 
          message: req.i18n.t('user.dailyReport.report.dailyReportCreated'),
          data: convertDeepTimestampsToWIB(result)
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 400).send({
          success: false,
          message: error.message || req.i18n.t('user.dailyReport.report.dailyReportCreateFailed')
        });
      }
    }, 500),
  });


};

export default addDailyReportProjectRoute;