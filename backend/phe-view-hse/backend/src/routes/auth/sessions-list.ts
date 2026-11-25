import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { Type } from '@fastify/type-provider-typebox';
import { withErrorHandler } from "../../utils/withErrorHandler.ts";
import { db } from "../../db/index.ts";
import { eq } from "drizzle-orm";
import { sessions } from "../../db/schema/index.ts";
import { getAuthInstance } from "../../decorators/auth.decorator.ts";
import { fromNodeHeaders } from "better-auth/node";

// Response schemas
const SessionListResponse = Type.Object({
  success: Type.Boolean(),
  data: Type.Array(Type.Object({
    id: Type.String({ format: 'uuid' }),
    expiresAt: Type.String({ format: 'date-time' }),
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Type.String({ format: 'date-time' }),
    ipAddress: Type.Union([Type.String(), Type.Null()]),
    userAgent: Type.Union([Type.String(), Type.Null()]),
    token: Type.String(), // Added token field to the response schema
  })),
});

/**
 * List user sessions
 * 
 * Returns a list of all active sessions for the authenticated user.
 */
const protectedRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/sessions-list',
    method: 'GET',
    schema: {
      tags: ['User'],
      summary: 'List user sessions',
      description: 'Get a list of all active sessions for the authenticated user',
      response: {
        200: SessionListResponse,
        // Updated to use proper HTTP status codes with Fastify Sensible
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

      const userId = session.user.id;

      // Get all sessions for the user
      const userSessions = await db
        .select({
          id: sessions.id,
          expiresAt: sessions.expiresAt,
          createdAt: sessions.createdAt,
          updatedAt: sessions.updatedAt,
          ipAddress: sessions.ipAddress,
          userAgent: sessions.userAgent,
          token: sessions.token, // Added token field to the select query
        })
        .from(sessions)
        .where(eq(sessions.userId, userId));

      return reply.status(200).send({
        success: true,
        data: userSessions.map(session => ({
          ...session,
          expiresAt: session.expiresAt.toISOString(),
          createdAt: session.createdAt.toISOString(),
          updatedAt: session.updatedAt.toISOString(),
        }))
      });
    }),
  });
};

export default protectedRoute;