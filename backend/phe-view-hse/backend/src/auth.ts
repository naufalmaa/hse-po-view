import {betterAuth} from 'better-auth';
import {drizzleAdapter} from 'better-auth/adapters/drizzle';
import {admin, openAPI, multiSession, customSession} from 'better-auth/plugins';
import {hssePassport} from './plugins/auth/hsse-passport.ts';
import {db} from './db/index.ts';
import envConfig from "./config/env.config.ts";
import { eq } from 'drizzle-orm';

const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    usePlural: true,
  }),
  plugins: [
    admin(),
    multiSession(),
    openAPI({
      path: '/docs',
    }),
    hssePassport(),
    customSession(async ({ user, session }) => {
     // get user role from database
     const userRecord = await db.query.users.findFirst({
       where: (fields) => eq(fields.id, user.id),
     });

      return {
        user: {
          ...user,
          role: userRecord?.role || 'user',
          hssePassportNumber: userRecord?.hssePassportNumber || '' as string | null,
        },
        session
      };
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 1 week
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache duration in seconds
    },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    requireEmailVerification: false,
    minPasswordLength: 1,
    maxPasswordLength: 128,
    autoSignIn: true,
    sendResetPassword: async ({user, url}) => {
      // Simulate sending a reset password email
      console.info(`Simulating sending reset password link to ${user.email} with URL: ${url}`);

      // Return a resolved promise with no value
      return Promise.resolve();
    },
    // sendResetPassword: async ({user, url, token}, request) => {
    //   await sendEmail({
    //     to: user.email,
    //     subject: "Reset your password",
    //     text: `Click the link to reset your password: ${url}`,
    //   });
    // },
    resetPasswordTokenExpiresIn: 3600, // 1 hour
  },

  advanced: {
    cookiePrefix: envConfig.server.cookiePrefix,
    database: {
      generateId: false,
    },
    disableCSRFCheck: true,  // Temporary for testing
  },
  trustedOrigins: envConfig.server.trustedOrigins,
  secret: envConfig.server.secretKey || process.env.BETTER_AUTH_SECRET,
  baseURL: envConfig.server.baseUrl || process.env.BETTER_AUTH_URL,
  debug: true,
});

export type User = typeof auth.$Infer.Session.user & {
  role?: string;
  hssePassportNumber?: string | null;
};
export type Session = typeof auth.$Infer.Session;

export default auth;
