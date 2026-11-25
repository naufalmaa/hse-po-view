import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { fromNodeHeaders } from 'better-auth/node';
import { getAuthInstance } from "../../decorators/auth.decorator.ts";
import {withErrorHandler} from "../../utils/withErrorHandler.ts";
import { Type } from '@sinclair/typebox';

const signOutRoute: FastifyPluginAsyncTypebox = async (app) => {
  // POST /sign-out
  app.route({
    url: '/log-out',
    method: 'POST',
    schema: {
      tags: ['default'],
      summary: 'Sign out',
      description: 'Clear current user session',
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      const auth = getAuthInstance(app);

      await auth.api.signOut({
        headers: fromNodeHeaders(req.headers),
      });

      return reply.send({ 
        success: true, 
        message: req.i18n.t('auth.sessionCleared') 
      });
    }),
  });
};
export default signOutRoute;