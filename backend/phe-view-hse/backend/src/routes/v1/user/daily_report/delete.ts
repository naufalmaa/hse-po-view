import { Type } from '@sinclair/typebox';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import {withErrorHandler} from "../../../../utils/withErrorHandler.ts";
import {deleteDailyReport, deleteSectionById} from '../../../../services/daily-report/delete.service.ts';

const ErrorResponse = Type.Object({ 
  success: Type.Optional(Type.Boolean()),
  message: Type.String() 
});
const SuccessResponse = Type.Object({ 
  success: Type.Boolean(),
  message: Type.String(),
});

const deleteSingleDailyReportRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'DELETE',
    url: '/:id',
    schema: {
      tags: ['Daily Report'],
      summary: 'Delete',
      params: Type.Object({
        id: Type.String({ format: 'uuid' }),
      }),
      response: {
        200: SuccessResponse,
        401: ErrorResponse,
        404: ErrorResponse,
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      const user = req.session.user;

      if (!user) {
        return reply.status(401).send({ 
          success: false,
          message: req.i18n.t('user.dailyReport.report.unauthorized')
        });
      }

      const { id } = req.params as { id: string };
      const result = await deleteDailyReport(id);

      if (!result.deleted) {
        return reply.status(404).send({ 
          success: false,
          message: result.reason || req.i18n.t('user.dailyReport.report.dailyReportNotFound')
        });
      }

      return reply.send({ 
        success: true,
        message: req.i18n.t('user.dailyReport.report.dailyReportDeleted'),
      });
    }),
  });
  // --- DELETE /Section/:id?reportId=... ---
  app.route({
    method: 'DELETE',
    url: '/section/:id',
    schema: {
      tags: ['Daily Report'],
      summary: 'Delete section by ID',
      description: 'Menghapus satu section (meeting, drill, training, permit, inspection) berdasarkan ID dan reportId',
      params: Type.Object({
        id: Type.String({ format: 'uuid' }),
      }),
      querystring: Type.Object({
        type: Type.String({
          enum: ['meeting', 'drill', 'training', 'permit', 'inspection', 'permitToWork'],
        }),
        reportId: Type.String({ format: 'uuid' }),
      }),
      response: {
        200: SuccessResponse,
        404: ErrorResponse,
      },
    },
    handler: withErrorHandler(async (req, reply) => {

      const { id } = req.params as { id: string };
      const { type, reportId } = req.query as { type: string; reportId: string };

      const normalizedType = (type === 'permitToWork' ? 'permit' : type) as 'meeting' | 'drill' | 'training' | 'permit' | 'inspection';
      const result = await deleteSectionById(normalizedType, id, reportId);

      if (!result.deleted) {
        return reply.status(404).send({ 
          success: false,
          message: result.reason || req.i18n.t('user.dailyReport.report.sectionNotFound')
        });
      }

      return reply.status(200).send({ 
        success: true,
        message: req.i18n.t('user.dailyReport.report.sectionDeleted'),
      });
    }),
  });

};

export default deleteSingleDailyReportRoute;