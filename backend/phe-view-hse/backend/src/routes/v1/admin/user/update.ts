import { Type } from '@sinclair/typebox';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { updateUserAdminService } from '../../../../services/users/update.service.ts';
import {withErrorHandler} from "../../../../utils/withErrorHandler.ts";

const updateUserAdminRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'PUT',
    url: '/:id',
    schema: {
      tags: ['Admin'],
      summary: 'Update user info',
      description: 'Admin updates name/image',
      params: Type.Object({
        id: Type.String(),
      }),
      body: Type.Object({
        name: Type.Optional(Type.String()),
        emailVerified: Type.Optional(Type.Boolean()),
        image: Type.Optional(Type.String()),
      }),
      response: {
        200: Type.Object({
          user: Type.Any(),
          message: Type.String(),
        }),
        400: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          error: Type.Optional(Type.Any()),
        }),
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      const user = req.session.user;
      const currentUserId = user?.id;
      const { id }  = req.params as { id: string };

      try {
        const updatedUser = await updateUserAdminService(id, req.body as any, currentUserId);
        return reply.send({ 
          user: updatedUser,
          message: req.i18n.t('admin.user.userUpdated')
        });
      } catch (err) {
        req.log.error(err);
        return reply.status(400).send({ 
          success: false, 
          message: req.i18n.t('admin.user.userUpdateFailed'),
          error: err 
        });
      }
    }),
  });
};

export default updateUserAdminRoute;