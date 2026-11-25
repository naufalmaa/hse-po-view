import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { Type, type Static } from '@fastify/type-provider-typebox';
import { withErrorHandler } from "../../utils/withErrorHandler.ts";
import { db } from "../../db/index.ts";
import { eq, and, ne } from "drizzle-orm";
import { sessions } from "../../db/schema/index.ts";
import { getAuthInstance } from "../../decorators/auth.decorator.ts";
import { fromNodeHeaders } from "better-auth/node";

// Request schema
const RevokeOtherSessionsRequest = Type.Object({
  token: Type.String()
});

type RevokeOtherSessionsRequestType = Static<typeof RevokeOtherSessionsRequest>;

// Response schema
const RevokeOtherSessionsResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String()
});

/**
 * Revoke other user sessions
 * 
 * Revokes all sessions for the authenticated user except the provided token
 */
const protectedRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/revoke-other-sessions-v1',
    method: 'POST',
    schema: {
      tags: ['User'],
      summary: 'Revoke other user sessions',
      description: 'Revokes all sessions for the authenticated user except the provided token',
      body: RevokeOtherSessionsRequest,
      response: {
        200: RevokeOtherSessionsResponse,
        '4xx': Type.Object({
          success: Type.Boolean({ default: false }),
          message: Type.String()
        }),
        '5xx': Type.Object({
          success: Type.Boolean({ default: false }),
          message: Type.String()
        })
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      const session = await getAuthInstance(app).api.getSession({
        headers: fromNodeHeaders(req.headers),
      });
      
      if (!session?.user) {
        return reply.status(401).send({
          success: false,
          message: req.i18n.t('auth.unauthorized')
        });
      }

      const { token } = req.body as RevokeOtherSessionsRequestType;
      
      // First, verify that the token belongs to the user
      const tokenSession = await db
        .select({
          userId: sessions.userId
        })
        .from(sessions)
        .where(eq(sessions.token, token));
        
      if (!tokenSession.length || tokenSession[0].userId !== session.user.id) {
        return reply.status(403).send({
          success: false,
          message: req.i18n.t('auth.forbidden')
        });
      }

      // Delete all sessions for the user except the provided token
      const deletedSessions = await db
        .delete(sessions)
        .where(and(
          eq(sessions.userId, session.user.id),
          ne(sessions.token, token)
        ))
        .returning({ id: sessions.id });

      return reply.status(200).send({
        success: true,
        message: req.i18n.t('auth.sessions_revoked', { count: deletedSessions.length })
      });
    }),
  });
};

export default protectedRoute;