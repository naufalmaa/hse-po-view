import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import {
  listAllDailyReports
} from '../../../../services/daily-report/list.service.ts';
import {withErrorHandler} from "../../../../utils/withErrorHandler.ts";
import type {ListDailyReportsParams} from "../../../../types/report.ts";
import { Type } from '@sinclair/typebox';
import { convertDeepTimestampsToWIB } from '../../../../utils/timezone.ts';

const SuccessResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Any(),
  meta: Type.Optional(Type.Any())
});

const ErrorResponse = Type.Object({
  success: Type.Optional(Type.Boolean()),
  message: Type.String()
});

const listAllDailyReportsRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/list',
    method: 'POST',
    schema: {
      tags: ['Daily Report'],
      summary: 'List daily reports with filter, pagination, and sorting',
      body: Type.Object({
        date_start: Type.Optional(Type.String()),
        date_end: Type.Optional(Type.String()),
        formTypes: Type.Optional(Type.Array(Type.String())),
        instansi: Type.Optional(Type.Array(Type.String())),
        subtypes: Type.Optional(Type.Array(Type.String())),
        workLocations: Type.Optional(Type.Array(Type.String())),
        vesselId: Type.Optional(Type.Array(Type.String())),
        search: Type.Optional(Type.String()),
        sort: Type.Optional(Type.String()),
        order: Type.Optional(Type.String()),
        page: Type.Optional(Type.Number()),
        view: Type.Optional(Type.Number()),
        showDetails: Type.Optional(Type.Boolean()),
        groupByDate: Type.Optional(Type.Boolean())
      }),
      response: {
        200: SuccessResponse,
        500: ErrorResponse
      }
    },
    handler: withErrorHandler(async (req, reply) => {
      const user = req.session.user;

      try {
        const data = await listAllDailyReports(req.body as ListDailyReportsParams, user);

        return reply.status(200).send({ 
          success: true, 
          message: req.i18n.t('user.dailyReport.report.dailyReportsListed'),
          data: convertDeepTimestampsToWIB(data.data),
          meta: data.meta
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: req.i18n.t('user.dailyReport.report.dailyReportsListFailed')
        });
      }
    }, 500),
  });
};

export default listAllDailyReportsRoute;