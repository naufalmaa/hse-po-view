import type {BetterAuthPlugin} from 'better-auth';
import {createAuthEndpoint} from 'better-auth/api';
import {db} from '../../db/index.ts';
import {users, accounts} from '../../db/schema/auth.schema.ts';
import {eq, and, desc} from 'drizzle-orm';
import {z} from 'zod';
import {setSessionCookie} from 'better-auth/cookies';

export const hssePassport = (): BetterAuthPlugin => {
  return {
    id: 'hsse-passport',
    endpoints: {
      signInPassport: createAuthEndpoint(
        '/sign-in/hsse-passport',
        {
          method: 'POST',
          body: z.object({
            hssePassportNumber: z.string(),
            password: z.string(),
            rememberMe: z.boolean().optional(),
          }),
        },
        async (ctx) => {
          const body = ctx.body as {hssePassportNumber: string; password: string; rememberMe?: boolean};
          const {hssePassportNumber, password, rememberMe} = body;

          const user = await db.query.users.findFirst({
            where: eq(users.hssePassportNumber, hssePassportNumber),
          });

          if (!user) {
            throw ctx.error('UNAUTHORIZED', {
              message: 'Invalid credentials',
            });
          }

          const account = await db.query.accounts.findFirst({
            where: and(
              eq(accounts.userId, user.id),
              eq(accounts.providerId, 'credential')
            ),
            orderBy: [desc(accounts.updatedAt)],
          });

          if (!account?.password) {
            throw ctx.error('UNAUTHORIZED', {
              message: 'Invalid credentials',
            });
          }

          const context = await ctx.context;
          const isValid = await context.password.verify({
            password,
            hash: account.password,
          });

          if (!isValid) {
            throw ctx.error('UNAUTHORIZED', {
              message: 'Invalid credentials',
            });
          }

          // Create session
          const session = await context.internalAdapter.createSession(
            user.id,
            rememberMe === false  // dontRememberMe = true when rememberMe is false
          );

          if (!session) {
            throw ctx.error('INTERNAL_SERVER_ERROR', {
              message: 'Session creation failed',
            });
          }

          // Set session cookies - this will trigger multiSession plugin automatically
          await setSessionCookie(
            ctx,
            { session, user: user as any },
            rememberMe === false  // same parameter for setSessionCookie
          );

          return {
            success: true,
            token: session.token,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              emailVerified: user.emailVerified,
              role: user.role,
              hssePassportNumber: user.hssePassportNumber,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
            },
          };
        }
      ),
    },
  };
};
