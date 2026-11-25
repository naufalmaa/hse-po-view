// routes/v1/user/notification/patch.ts

import { Type } from '@sinclair/typebox';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { markNotificationAsRead } from '../../../../services/notification.service.ts';

const patchNotificationRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'PATCH',
    url: '/:id',
    schema: {
      tags: ['Notification'],
      summary: 'Mark a notification as read',
      params: Type.Object({
        id: Type.String({ format: 'uuid' }),
      }),
    },
    handler: withErrorHandler(async (req, reply) => {
      const user = req.session.user;
      const { id } = req.params as { id: string };

      await markNotificationAsRead(user.id, id);
      return reply.send({ success: true, message: 'Notification marked as read' });
    }),
  });
};

export default patchNotificationRoute;
