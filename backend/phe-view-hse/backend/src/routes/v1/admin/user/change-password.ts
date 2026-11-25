import { Type, type Static } from '@sinclair/typebox';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import {withErrorHandler} from "../../../../utils/withErrorHandler.ts";
import { getAuthInstance } from '../../../../decorators/auth.decorator.ts';
import { db } from '../../../../db/index.ts';
import { accounts, users } from '../../../../db/schema/auth.schema.ts';
import { eq, and } from 'drizzle-orm';

export const changePasswordBodySchema = Type.Object({
  userId: Type.String(),
  newPassword: Type.String({ minLength: 8 }),
});

type ChangePasswordBodyType = Static<typeof changePasswordBodySchema>;

const adminChangePasswordRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'PUT',
    url: '/change-password',
    schema: {
      tags: ['Admin'],
      summary: 'Admin change user password',
      body: changePasswordBodySchema,
      response: {
        200: Type.Object({
          success: Type.Boolean({ default: true }),
          message: Type.String(),
        }),
        '4xx': Type.Object({
          success: Type.Boolean({ default: false }),
          message: Type.String()
        }),
        '5xx': Type.Object({
          success: Type.Boolean({ default: false }),
          message: Type.String()
        }),
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      try {
        const body = req.body as ChangePasswordBodyType;
        
        // Validate request body
        if (!body.userId || !body.newPassword) {
          return reply.badRequest(req.i18n.t('admin.user.userIdAndNewPasswordRequired'));
        }
        
        const auth = getAuthInstance(app);
    
        // First, check if the user exists
        const [user] = await db.select().from(users).where(eq(users.id, body.userId));
        
        if (!user) {
          return reply.badRequest(req.i18n.t('admin.user.userNotFound'));
        }
        
        const context = await auth.$context;
        const hashedPassword = await context.password.hash(body.newPassword);
        const now = new Date();

        // Check if there are credential accounts for this user
        const existingAccounts = await db.select().from(accounts).where(
          and(
            eq(accounts.userId, body.userId),
            eq(accounts.providerId, 'credential')
          )
        );

        if (existingAccounts.length === 0) {
          // If no credential account exists, create one
          await db.insert(accounts).values({
            providerId: 'credential',
            accountId: body.userId,
            userId: body.userId,
            password: hashedPassword,
            createdAt: now,
            updatedAt: now,
          });
        } else {
          // Update the primary account with the new hashed password
          const [primaryAccount, ...duplicateAccounts] = existingAccounts;

          await db.update(accounts)
            .set({
              password: hashedPassword,
              updatedAt: now,
            })
            .where(eq(accounts.id, primaryAccount.id));

          // Clean up any duplicate credential accounts for this user
          if (duplicateAccounts.length > 0) {
            for (const dup of duplicateAccounts) {
              await db.delete(accounts).where(eq(accounts.id, dup.id));
            }
          }
        }

        return reply.status(200).send({
          success: true,
          message: req.i18n.t('admin.user.passwordUpdated'),
        });
      } catch (err) {
        return reply.internalServerError(req.i18n.t('admin.user.passwordUpdateFailed'));
      }
    }),
  });
};

export default adminChangePasswordRoute;