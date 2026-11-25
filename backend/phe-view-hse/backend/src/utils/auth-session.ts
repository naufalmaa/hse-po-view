import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { getAuthInstance } from '../decorators/auth.decorator.ts';
import { db } from '../db/index.ts';
import { sessions } from '../db/schema/auth.schema.ts';
import { eq, and, gt } from 'drizzle-orm';

export async function resolveSession(fastify: FastifyInstance, req: FastifyRequest) {
  // 1. Try Better Auth getSession with headers
  try {
    const betterSession = await getAuthInstance(fastify).api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (betterSession?.user) {
      return betterSession;
    }
  } catch {}

  // 2. Fallback: extract token from Authorization header, query, or cookies
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.slice(7).trim();
  }

  if (!token && req.query) {
    const query = req.query as Record<string, string | undefined>;
    token = query.token || query.access_token || query.session_token || query.bearer;
  }

  if (!token && req.headers.cookie) {
    const cookies = req.headers.cookie.split(';');
    // Check session_token first
    for (const c of cookies) {
      const [name, ...rest] = c.trim().split('=');
      const val = rest.join('=');
      if (name && (name.includes('session_token') || name === 'token') && !name.includes('session_data')) {
        token = decodeURIComponent(val || '');
        if (token) break;
      }
    }
  }

  if (!token) return null;

  // Better Auth tokens may be signed: "token.signature" -> extract raw token
  const rawToken = token.includes('.') ? token.split('.')[0] : token;

  const sessionRecord = await db.query.sessions.findFirst({
    where: and(eq(sessions.token, rawToken), gt(sessions.expiresAt, new Date())),
    with: { user: true },
  });

  if (!sessionRecord || !sessionRecord.user) return null;

  return {
    session: {
      id: sessionRecord.id,
      token: sessionRecord.token,
      userId: sessionRecord.userId,
      expiresAt: sessionRecord.expiresAt,
      createdAt: sessionRecord.createdAt,
      updatedAt: sessionRecord.updatedAt,
      ipAddress: sessionRecord.ipAddress,
      userAgent: sessionRecord.userAgent,
      impersonatedBy: sessionRecord.impersonatedBy,
    },
    user: {
      ...sessionRecord.user,
      role: sessionRecord.user.role || 'user',
      hssePassportNumber: sessionRecord.user.hssePassportNumber || '',
    },
  };
}
