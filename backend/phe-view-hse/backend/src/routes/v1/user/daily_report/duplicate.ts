import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { DuplicateDailyReportSchema, type DuplicateDailyReportType } from '../../../../schema/report.schema.ts';
import { duplicateDailyReport } from '../../../../services/daily-report/duplicate.service.ts';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { convertDeepTimestampsToWIB } from '../../../../utils/timezone.ts';

const duplicateDailyReportRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/duplicate',
    method: 'POST',
    schema: {
      tags: ['Daily Report'],
      summary: 'Duplicate Daily Report',
      body: DuplicateDailyReportSchema,
    },
    handler: withErrorHandler(async (req, reply) => {
      const user = req.session.user;

      try {
        const result = await duplicateDailyReport(req.body as DuplicateDailyReportType, {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as 'admin' | 'user' | 'crew',
        });
        return reply.send({
          success: true,
          message: 'Laporan harian berhasil diduplikasi',
          data: convertDeepTimestampsToWIB(result),
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 400).send({
          success: false,
          message: error.message || 'Gagal menduplikasi laporan harian',
        });
      }
    }),
  });
};

export default duplicateDailyReportRoute;
