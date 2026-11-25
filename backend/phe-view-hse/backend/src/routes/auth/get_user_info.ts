import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { withErrorHandler } from '../../utils/withErrorHandler.ts';
import { db } from '../../db/index.ts';
import { users, userContractors, subContractors, contractorVessels, vessels } from '../../db/schema/auth.schema.ts';
import { eq, inArray, type InferSelectModel } from 'drizzle-orm';
import { Type } from '@sinclair/typebox';
import env from '../../config/env.config.ts';
import { getAuthInstance } from '../../decorators/auth.decorator.ts';
import { fromNodeHeaders } from 'better-auth/node';

const getUserInfoRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'GET',
    url: '/user-info',
    schema: {
      tags: ['default'],
      summary: 'Get User Info',
      description: 'Return authenticated user info. If role is contractor, include subcontractors. If role is crew, include vessel info.',
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Any(),
        }),
        401: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          error: Type.Optional(Type.String()),
        }),
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      // Get session directly from auth API (same approach as session.ts)
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
      const [user] = await db.select().from(users).where(eq(users.id, userId));

      if (!user) {
        return reply.status(401).send({ 
          success: false,
          message: req.i18n.t('auth.userNotFoundInDb')
        });
      }
      
      const BASE_URL = `${env.server.uploadsUrl}/${env.server.uploadsUserDir}`;
      
      // Base user info
      const userInfo: Record<string, any> = { ...user };

      // Build URLs from filenames
      if (user.image) {
        userInfo.image = `${BASE_URL}/${user.id}/${user.image}`;
      }
      if (user.signature) {
        userInfo.signature = `${BASE_URL}/${user.id}/${user.signature}`;
      }

      // Add subContractors only if contractor
      if (user.role === 'contractor') {
        const mappings = await db
          .select({ contractorId: userContractors.contractorId })
          .from(userContractors)
          .where(eq(userContractors.userId, userId));

        const contractorIds = mappings.map((m) => m.contractorId);

        if (contractorIds.length) {
          const subContractorsList: InferSelectModel<typeof subContractors>[] =
            await db
              .select()
              .from(subContractors)
              .where(inArray(subContractors.id, contractorIds));

          userInfo.subContractors = subContractorsList;
        } else {
          userInfo.subContractors = [];
        }
      }
      // Add vessel info only if crew
      else if (user.role === 'crew') {
        const vesselInfo = await db
          .select({
            vesselId: vessels.id,
            vesselName: vessels.vesselName,
            vesselType: vessels.type,
          })
          .from(users)
          .leftJoin(userContractors, eq(users.id, userContractors.userId))
          .leftJoin(contractorVessels, eq(userContractors.contractorId, contractorVessels.contractorId))
          .leftJoin(vessels, eq(contractorVessels.vesselId, vessels.id))
          .where(eq(users.id, userId))
          .limit(1);
        
        if (vesselInfo.length > 0 && vesselInfo[0].vesselId) {
          userInfo.vessel = {
            id: vesselInfo[0].vesselId,
            name: vesselInfo[0].vesselName,
            type: vesselInfo[0].vesselType,
          };
        } else {
          userInfo.vessel = null;
        }
      }

      return reply.status(200).send({ 
        success: true,
        message: req.i18n.t('auth.userInfo'),
        data: userInfo,
      });
    }),
  });
};

export default getUserInfoRoute;