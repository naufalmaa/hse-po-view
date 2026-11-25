import { Type } from '@sinclair/typebox';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import {withErrorHandler} from "../../../../utils/withErrorHandler.ts";
import { getDailyReportDetail } from '../../../../services/daily-report/detail.service.ts';
import { convertDeepTimestampsToWIB } from '../../../../utils/timezone.ts';

const ErrorResponse = Type.Object({
  success: Type.Optional(Type.Boolean()),
  message: Type.String(),
});

const SuccessResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Unknown(),
});

const getDailyReportDetailRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'GET',
    url: '/detail/:id',
    schema: {
      tags: ['Daily Report'],
      summary: 'Details by id',
      params: Type.Object({
        id: Type.String({ format: 'uuid' }),
      }),
      querystring: Type.Object({
        forceRecalculate: Type.Optional(Type.Boolean()),
      }),
      response: {
        200: SuccessResponse,
        404: ErrorResponse,
      },
    },
    handler: withErrorHandler(async (req, reply) => {

      const { id } = req.params as { id: string };
      const { forceRecalculate } = (req.query || {}) as { forceRecalculate?: boolean };

      const report = await getDailyReportDetail(id, { forceRecalculate });
      if (!report) {
        return reply.status(404).send({ 
          success: false,
          message: req.i18n.t('user.dailyReport.report.dailyReportNotFound')
        });
      }

      return reply.status(200).send({ 
        success: true,
        message: req.i18n.t('user.dailyReport.report.dailyReportDetailRetrieved'),
        data: convertDeepTimestampsToWIB(report)
      });
    }),
  });
};

export default getDailyReportDetailRoute;