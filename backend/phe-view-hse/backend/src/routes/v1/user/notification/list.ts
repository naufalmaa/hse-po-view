// routes/v1/user/notification/list.ts

import { Type } from '@sinclair/typebox';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { getNotifications } from '../../../../services/notification.service.ts';
import { convertDeepTimestampsToWIB } from '../../../../utils/timezone.ts';

const listNotificationRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'GET',
    url: '/',
    schema: {
      tags: ['Notification'],
      summary: 'List alarm notifications',
      querystring: Type.Object({
        onlyUnread: Type.Optional(Type.Boolean({ default: false })),
        orderBy: Type.Optional(
          Type.Union([Type.Literal('asc'), Type.Literal('desc')], { default: 'desc' })
        ),
        limit: Type.Optional(Type.Integer({ minimum: 1, default: 20 })),
        page: Type.Optional(Type.Integer({ minimum: 0, default: 0 })), // page 0-based
      }),
      response: {
        200: Type.Any(),
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      const user = req.session.user;
      const { onlyUnread = false, orderBy = 'desc', limit = 20, page = 0 } = req.query as {
        onlyUnread?: boolean;
        orderBy?: 'asc' | 'desc';
        limit?: number;
        page?: number;
      };

      const notifications = await getNotifications(user.id, {
        onlyUnread,
        orderBy,
        limit,
        page,
      });

      return reply.send({
        success: true,
        message: req.i18n.t('user.notification.notificationsRetrieved'),
        data: {
          employee: convertDeepTimestampsToWIB(notifications.data.employee),
          csms: convertDeepTimestampsToWIB(notifications.data.csms)
        },
        meta: notifications.meta
      });
    }),
  });
};

export default listNotificationRoute;