import { Type, type Static } from '@sinclair/typebox';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { fromNodeHeaders } from 'better-auth/node';
import { getAuthInstance } from '../../../../decorators/auth.decorator.ts';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';

const RevokeSessionBodySchema = Type.Object({
  sessionToken: Type.String({
    examples: ['XzeTzZMfduAYBKX7qrSqdWLI5pWQnClE'],
  }),
  userId: Type.String({
    examples: ['a37d21da-fd10-48bc-8281-9e95d2cccdd2'],
  }),
});

type RevokeSessionBodyType = Static<typeof RevokeSessionBodySchema>;

const revokeSessionRoute: FastifyPluginAsyncTypebox = async (app) => {
  // POST /revoke-session
  app.route({
    url: '/revoke',
    method: 'POST',
    schema: {
      tags: ['Admin'],
      summary: 'Revoke a specific session',
      description: 'Revoke a specific session for a user',
      body: RevokeSessionBodySchema,
      response: {
        200: Type.Object({
          success: Type.Boolean({ default: true }),
          message: Type.String()
        }),
        '4xx': Type.Object({
          success: Type.Boolean({ default: false }),
          message: Type.String()
        }),
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      const auth = getAuthInstance(app);
      const body = req.body as RevokeSessionBodyType;
      try {
        await auth.api.revokeUserSession({
          body: {
            sessionToken: body.sessionToken,
          },
          headers: fromNodeHeaders(req.headers),
        });

        reply.status(200).send(req.i18n.t('admin.session.sessionRevoked'));
      } catch (err) {
        return reply.badRequest(req.i18n.t('admin.session.sessionRevokeFailed'));
      }
    }),
  });

  // POST /revoke-all-sessions
  app.route({
    url: '/revoke-all',
    method: 'POST',
    schema: {
      tags: ['Admin'],
      summary: 'Revoke all sessions',
      description: 'Revoke all sessions for a user',
      body: RevokeSessionBodySchema,
      response: {
        200: Type.Object({
          success: Type.Boolean({ default: true }),
          message: Type.String()
        }),
        '4xx': Type.Object({
          success: Type.Boolean({ default: false }),
          message: Type.String()
        }),
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      const body = req.body as RevokeSessionBodyType;
      const auth = getAuthInstance(app);
      try {
        await auth.api.revokeUserSessions({
          body: {
            userId: body.userId,
          },
          headers: fromNodeHeaders(req.headers),
        });
        reply.status(200).send(req.i18n.t('admin.session.allSessionsRevoked'));
      } catch (err) {
        return reply.badRequest(req.i18n.t('admin.session.allSessionsRevokeFailed'));
      }
    }),
  });
};

export default revokeSessionRoute;