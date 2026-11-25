import {Type} from "@sinclair/typebox";
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import {withErrorHandler} from "../../../../utils/withErrorHandler.ts";
import {deleteDailyReports, deleteSectionsBulk} from '../../../../services/daily-report/delete.service.ts';

const ErrorResponse = Type.Object({ 
  success: Type.Optional(Type.Boolean()),
  message: Type.String() 
});

const DeleteDailyReportsRequest = Type.Object({
  ids: Type.Array(Type.String({ format: 'uuid' }), { minItems: 1 }),
});

const SuccessResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Optional(Type.Number()),
});

export const DeleteSectionRequest = Type.Object({
  type: Type.Union([
    Type.Literal('meeting'),
    Type.Literal('drill'),
    Type.Literal('training'),
    Type.Literal('permit'),
    Type.Literal('inspection'),
    Type.Literal('permitToWork'),
  ]),
  ids: Type.Array(Type.String({ format: 'uuid' }), { minItems: 1 }),
  reportId: Type.String({ format: 'uuid' }),
});

const DeleteSectionsResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  deleted: Type.Boolean(),
  totalDeleted: Type.Optional(Type.Number())
});

const deleteBulkDailyReportsRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'DELETE',
    url: '/bulk-delete',
    schema: {
      tags: ['Daily Report'],
      summary: 'Bulk Delete',
      body: DeleteDailyReportsRequest,
      response: {
        200: SuccessResponse,
        404: ErrorResponse,
      },
    },
    handler: withErrorHandler(async (req, reply) => {
    
      const { ids } = req.body as { ids: string[] };
      const result = await deleteDailyReports(ids);

      if (!result.deleted) {
        return reply.status(404).send({ 
          success: false,
          message: req.i18n.t('user.dailyReport.report.dailyReportNotFound')
        });
      }

      return reply.status(200).send({ 
        success: true,
        message: req.i18n.t('user.dailyReport.report.dailyReportsDeleted'),
        data: result.totalDeleted
      });
    }),
  });
   app.route({
    method: 'DELETE',
    url: '/bulk-delete-sections',
    schema: {
      tags: ['Daily Report'],
      summary: 'Bulk Delete Sections',
      body: DeleteSectionRequest,
      response: {
        200: DeleteSectionsResponse,
        400: ErrorResponse,
        404: ErrorResponse,
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      
      const { type, ids, reportId } = req.body as { type: string; ids: string[]; reportId: string };
      const validTypes = ['meeting', 'drill', 'training', 'permit', 'inspection', 'permitToWork'] as const;
      type SectionType = typeof validTypes[number];

      if (!validTypes.includes(type as SectionType)) {
        return reply.status(400).send({ 
          success: false,
          message: req.i18n.t('user.dailyReport.report.invalidSectionType')
        });
      }

      const normalizedType = type === 'permitToWork' ? 'permit' : type;
      const result = await deleteSectionsBulk(normalizedType as 'meeting' | 'drill' | 'training' | 'permit' | 'inspection', ids, reportId);

      if (!result.deleted) {
        return reply.status(404).send({ 
          success: false,
          message: req.i18n.t('user.dailyReport.report.sectionNotFound')
        });
      }

      return reply.status(200).send({ 
        success: true,
        message: req.i18n.t('user.dailyReport.report.sectionsDeleted'),
        data: result.totalDeleted
      });
    }),
  });
};

export default deleteBulkDailyReportsRoute;
