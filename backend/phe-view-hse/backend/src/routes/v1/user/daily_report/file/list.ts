import { Type } from '@sinclair/typebox';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { listFiles } from '../../../../../services/daily-report/files/list.service.ts';
import { withErrorHandler } from '../../../../../utils/withErrorHandler.ts';

const SuccessResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Optional(Type.Any()),
  meta: Type.Optional(Type.Any()),
});

const ErrorResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String()
});

const listFilesRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'GET',
    url: '/:reportId',
    schema: {
      tags: ['Daily Report'],
      summary: 'Get list of files by reportId with filters',
      params: Type.Object({
        reportId: Type.String({ format: 'uuid' }),
      }),
      querystring: Type.Object({
        sectionType: Type.Optional(Type.String()),
        search: Type.Optional(Type.String()),
        sort: Type.Optional(Type.Union([
          Type.Literal('createdAt'),
          Type.Literal('note'),
          Type.Literal('filePath'),
        ])),
        order: Type.Optional(Type.Union([
          Type.Literal('asc'),
          Type.Literal('desc'),
        ])),
        page: Type.Optional(Type.Integer({ minimum: 0 })),
        limit: Type.Optional(Type.Integer({ minimum: 1 })),
      }),
      response: {
        200: SuccessResponse,
        500: ErrorResponse
      }
    },

    handler: withErrorHandler(async (req, reply) => {
      try {
        const { reportId } = req.params as { reportId: string };
        const {
          sectionType,
          search,
          sort,
          order,
          page,
          limit,
        } = req.query as {
          sectionType?: string;
          search?: string;
          sort?: 'createdAt' | 'note' | 'filePath';
          order?: 'asc' | 'desc';
          page?: number;
          limit?: number;
        };

        const files = await listFiles({
          reportId,
          sectionType,
          search,
          sort,
          order,
          page,
          limit,
        });

        return reply.status(200).send({
          success: true,
          message: req.i18n.t('user.dailyReport.file.filesListed'),
          data: files.data,
          meta: files.meta,
          
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: req.i18n.t('user.dailyReport.file.filesDeleteFailed')
        });
      }
    }),
  });
};

export default listFilesRoute;