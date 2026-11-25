import { Type, type Static } from '@sinclair/typebox';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import {withErrorHandler} from "../../../../utils/withErrorHandler.ts";
import { fromNodeHeaders } from 'better-auth/node';
import { getAuthInstance } from '../../../../decorators/auth.decorator.ts';
import { db } from '../../../../db/index.ts';
import { userAlarmLog } from '../../../../db/schema/auth.schema.ts';
import { dailyReports } from '../../../../db/schema/report.schema.ts';
import { eq } from 'drizzle-orm';

export const DeleteUserBodySchema = Type.Object({
  userId: Type.String(),
});

export type DeleteUserBodyType = Static<typeof DeleteUserBodySchema>;

const deleteRoute: FastifyPluginAsyncTypebox = async (app) => {
  // DELETE
  app.route({
    url: '/delete',
    method: 'DELETE',
    schema: {
      tags: ['Admin'],
      summary: 'Delete user',
      description: 'Delete user by ID',
      body: DeleteUserBodySchema,
      response: {
        200: Type.Object({
          success: Type.Boolean({ default: true }),
          message: Type.String(),
        }),
        '4xx': Type.Object({
          success: Type.Boolean({ default: false }),
          message: Type.String()
        }),
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      const body = req.body as DeleteUserBodyType;
      const auth = getAuthInstance(app);

      try {
        // First, check if there are any daily reports created by this user
        const userReports = await db.select().from(dailyReports).where(eq(dailyReports.createdByUserId, body.userId));
        
        if (userReports.length > 0) {
          return reply.badRequest(req.i18n.t('admin.user.userDeleteFailedHasReports', { count: userReports.length }));
        }
        
        // Then, delete all user alarm logs associated with this user
        await db.delete(userAlarmLog).where(eq(userAlarmLog.userId, body.userId));
        
        // Finally, delete the user
        await auth.api.removeUser({
          body: { userId: body.userId },
          headers: fromNodeHeaders(req.headers),
        });
        return reply.status(200).send(req.i18n.t('admin.user.userDeleted'));
      } catch (err) {
        req.log.error(err);
        
        // Check if it's a foreign key constraint error
        if (err instanceof Error && err.message.includes('foreign key constraint')) {
          return reply.badRequest(req.i18n.t('admin.user.userDeleteFailedForeignKey'));
        }
        
        return reply.badRequest(req.i18n.t('admin.user.userDeleteFailed'));
      }
    }),
  });
};

export default deleteRoute;