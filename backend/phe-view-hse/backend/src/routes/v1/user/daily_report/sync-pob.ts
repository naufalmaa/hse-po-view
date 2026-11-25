import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { convertDeepTimestampsToWIB } from '../../../../utils/timezone.ts';
import { db } from '../../../../db/index.ts';
import { dailyReports } from '../../../../db/schema/report.schema.ts';
import { eq } from 'drizzle-orm';
import { recalculateLogManhoursForDate } from '../../../../services/daily-report/logManhoursTrigger.service.ts';
import { getDailyReportDetail } from '../../../../services/daily-report/detail.service.ts';

const SuccessResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Unknown(),
});

const ErrorResponse = Type.Object({
  success: Type.Optional(Type.Boolean()),
  message: Type.String(),
});

const syncDailyReportPobRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'POST',
    url: '/sync-pob/:id',
    schema: {
      tags: ['Daily Report'],
      summary: 'Sync POB and recalculate manhours for a daily report',
      params: Type.Object({
        id: Type.String({ format: 'uuid' }),
      }),
      response: {
        200: SuccessResponse,
        404: ErrorResponse,
        500: ErrorResponse,
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      const { id } = req.params as { id: string };

      const [report] = await db
        .select({
          id: dailyReports.id,
          reportDate: dailyReports.reportDate,
        })
        .from(dailyReports)
        .where(eq(dailyReports.id, id));

      if (!report) {
        return reply.status(404).send({
          success: false,
          message: 'Laporan harian tidak ditemukan',
        });
      }

      // Recalculate log_manhours for the report date
      await recalculateLogManhoursForDate(report.reportDate);

      // Fetch freshly recalculated detail
      const freshDetail = await getDailyReportDetail(id, { forceRecalculate: true });

      return reply.status(200).send({
        success: true,
        message: 'POB dan Manhours berhasil disinkronkan',
        data: convertDeepTimestampsToWIB(freshDetail),
      });
    }),
  });
};

export default syncDailyReportPobRoute;
