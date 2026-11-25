// routes/v1/user/notification/patch-all.ts

import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { markAllNotificationsAsRead } from '../../../../services/notification.service.ts';

const patchAllNotificationsRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'PATCH',
    url: '/mark-all',
    schema: {
      tags: ['Notification'],
      summary: 'Mark all notifications as read',
    },
    handler: withErrorHandler(async (req, reply) => {
      const user = req.session.user;

      await markAllNotificationsAsRead(user.id);
      return reply.send({ success: true, message: 'All notifications marked as read' });
    }),
  });
};

export default patchAllNotificationsRoute;
