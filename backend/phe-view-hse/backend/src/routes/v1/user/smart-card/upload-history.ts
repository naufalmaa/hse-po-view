import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { listUploadHistoryService } from '../../../../services/smartCardObservations/uploadHistory.service.ts';
import { convertArrayTimestampsToWIB } from '../../../../utils/timezone.ts';

const uploadHistoryRoute: FastifyPluginAsyncTypebox = async (app) => {
 // Get Upload History Route
  app.route({
    method: 'GET',
    url: '/upload-observations/history',
    schema: {
      tags: ['Smart Card'],
      summary: 'Get Upload History',
      description: 'Get recent upload history for smart card observations',
      querystring: Type.Object({
        limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 10 })),
        page: Type.Optional(Type.Number({ minimum: 0, default: 0 })),
        search: Type.Optional(Type.String()),
        status: Type.Optional(Type.Array(Type.Union([Type.Literal('success'), Type.Literal('error')]))),
        hasErrors: Type.Optional(Type.Array(Type.Boolean())),
        date_start: Type.Optional(Type.String({ format: 'date' })),
        date_end: Type.Optional(Type.String({ format: 'date' })),
        sortBy: Type.Optional(Type.String({ default: 'createdAt' })),
        orderBy: Type.Optional(Type.Union([Type.Literal('asc'), Type.Literal('desc')], { default: 'desc' })),
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Array(Type.Object({
            id: Type.String(),
            filename: Type.String(),
            status: Type.Union([Type.Literal('success'), Type.Literal('error')]),
            totalRows: Type.Optional(Type.Number()),
            validRows: Type.Optional(Type.Number()),
            errorRows: Type.Optional(Type.Number()),
            skippedRows: Type.Optional(Type.Number()),
            insertedRows: Type.Optional(Type.Number()),
            firstId: Type.Optional(Type.Number()),
            lastId: Type.Optional(Type.Number()),
            errorMessage: Type.Optional(Type.String()),
            hasErrors: Type.Optional(Type.Boolean()),
            createdAt: Type.String(),
          })),
          meta: Type.Object({
            total: Type.Number(),
            page: Type.Number(),
            view: Type.Number(),
            totalPages: Type.Number(),
            date_start: Type.String(),
            date_end: Type.String(),
          }),
        }),
        500: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
      },
    },

    handler: withErrorHandler(async (req, reply) => {
      try {
        const query = req.query as {
          limit?: number;
          page?: number;
          search?: string;
          status?: ('success' | 'error')[];
          hasErrors?: boolean[];
          date_start?: string;
          date_end?: string;
          sortBy?: string;
          orderBy?: 'asc' | 'desc';
        };
        
        const user = req.session.user;
        
        const result = await listUploadHistoryService({
          ...query,
          userId: user.id,
          role: user.role
        });
        
        return reply.send({
          success: true,
          message: req.i18n.t('user.smartCard.uploadHistoryRetrieved'),
          data: convertArrayTimestampsToWIB(result.data),
          meta: result.meta,
        });
      } catch (error) {
        return reply.code(500).send({
          success: false,
          message: req.i18n.t('user.smartCard.uploadHistoryFailed'),
        });
      }
    }),
  });
}

export default uploadHistoryRoute;