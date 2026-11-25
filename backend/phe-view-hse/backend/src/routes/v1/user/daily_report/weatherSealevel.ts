import { Type } from '@sinclair/typebox';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { getLatestWeatherSealevel, getOrFetchWeatherSealevelByDate } from '../../../../services/daily-report/weatherSealevel.service.ts';

const latestReportWeatherSealevelRoute: FastifyPluginAsyncTypebox = async (app) => {
  // GET /latest
  app.route({
    method: 'GET',
    url: '/latest',
    schema: {
      tags: ['Weather/Sealevel'],
      summary: 'Get latest region weather & sea level payload (by triggerAt)',
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({
            id: Type.String(),
            triggerAt: Type.String({ format: 'date-time' }),
            regionWeather: Type.Any(),
            regionSealevel: Type.Any(),
          }),
        }),
        404: Type.Object({ 
          success: Type.Optional(Type.Boolean()),
          message: Type.String() 
        }),
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      const row = await getLatestWeatherSealevel();
      if (!row) {
        return reply.code(404).send({ 
          success: false,
          message: req.i18n.t('user.dailyReport.report.weatherDataNotFound')
        });
      }
      // Send the row directly to match the schema
      return reply.status(200).send({
        success: true,
        message: req.i18n.t('user.dailyReport.report.weatherDataRetrieved'),
        data: row
      });
    }),
  });

  // GET /by-date?date=YYYY-MM-DD
  app.route({
    method: 'GET',
    url: '/by-date',
    schema: {
      tags: ['Weather/Sealevel'],
      summary: 'Get region weather & sea level by date (WIB)',
      querystring: Type.Object({
        date: Type.String({ format: 'date', description: 'Format: YYYY-MM-DD (WIB)' }),
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({
            id: Type.String(),
            triggerAt: Type.String({ format: 'date-time' }),
            regionWeather: Type.Any(),
            regionSealevel: Type.Any(),
          })
        }),
        404: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        }),
        500: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        })
      }
    },
    handler: withErrorHandler(async (req, reply) => {
      const { date } = req.query as { date: string };

      const coords = [
        { lat: -5.09992, lon: 106.34848 },
        { lat: -4.61543, lon: 106.61809, location_id: 1 },
        { lat: -5.46531, lon: 106.34728, location_id: 2 },
      ];

      try {
        const result: any = await getOrFetchWeatherSealevelByDate(date, {
          coords,
          timezone: 'Asia/Bangkok',
          abortMs: 20000,
        });

        // Handle the case where result has success=false
        if ('success' in result && !result.success) {
          return reply.status(404).send({
            success: false,
            message: req.i18n.t('user.dailyReport.report.weatherDataNotFound')
          });
        }

        // Handle successful result - extract data from either direct object or data property
        const data = result.data || result;
        
        return reply.status(200).send({
          success: true,
          message: req.i18n.t('user.dailyReport.report.weatherDataRetrieved'),
          data: data
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: req.i18n.t('user.dailyReport.report.weatherDataRetrieveFailed')
        });
      }
    }),
  });
};

export default latestReportWeatherSealevelRoute;