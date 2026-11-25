import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { withErrorHandler } from '../../utils/withErrorHandler.ts';
import { db } from '../../db/index.ts';
import { users } from '../../db/schema/auth.schema.ts';
import { count, ilike, eq, and, or, inArray } from 'drizzle-orm';
import { getAuthInstance } from '../../decorators/auth.decorator.ts';
import { fromNodeHeaders } from 'better-auth/node';
import { getUsersWithSubContractorsAndVessels } from '../../services/users/list.service.ts';

const listUsersRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'GET',
    url: '/list-users',
    schema: {
      tags: ['Auth'],
      summary: 'List users with pagination and role filter',
      description: 'List all users with pagination, search, and role filtering. Requires authentication.',
      querystring: Type.Object({
        page: Type.Optional(Type.Number({ minimum: 0, default: 0 })),
        limit: Type.Optional(Type.Number({ minimum: 1, default: 50 })),
        search: Type.Optional(Type.String()),
        role: Type.Optional(
          Type.Union([
            Type.Literal('admin'),
            Type.Literal('user'),
            Type.Literal('evaluator'),
            Type.Literal('verifikator'),
            Type.Literal('manager'),
            Type.Literal('contractor'),
            Type.Literal('crew'),
            Type.Array(
              Type.Union([
                Type.Literal('admin'),
                Type.Literal('user'),
                Type.Literal('evaluator'),
                Type.Literal('verifikator'),
                Type.Literal('manager'),
                Type.Literal('contractor'),
                Type.Literal('crew'),
              ])
            ),
          ])
        ),
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Array(
            Type.Object({
              id: Type.String({ format: 'uuid' }),
              email: Type.String({ format: 'email' }),
              name: Type.String(),
              role: Type.String(),
              emailVerified: Type.Boolean(),
              banned: Type.Boolean(),
              image: Type.Union([Type.String(), Type.Null()]),
              signature: Type.Union([Type.String(), Type.Null()]),
              createdAt: Type.String({ format: 'date-time' }),
              updatedAt: Type.String({ format: 'date-time' }),
              subContractors: Type.Optional(Type.Any()),
              vessel: Type.Optional(Type.Any()),
            })
          ),
          meta: Type.Object({
            total: Type.Number(),
            page: Type.Number(),
            limit: Type.Number(),
            totalPages: Type.Number(),
          }),
        }),
        401: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      // Check authentication
      const session = await getAuthInstance(app).api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (!session?.user) {
        return reply.status(401).send({
          success: false,
          message: req.i18n.t('auth.unauthorized'),
        });
      }

      const { page = 0, limit = 10, search, role } = req.query as {
        page?: number;
        limit?: number;
        search?: string;
        role?: string | string[];
      };

      // Validate pagination parameters
      const pageNumber = Math.max(0, page);
      const limitNumber = Math.max(1, limit);
      const offset = pageNumber * limitNumber;

      // Build where conditions
      const conditions: any[] = [];

      // Add role filter if provided
      const validRoles = ['admin', 'user', 'evaluator', 'verifikator', 'manager', 'contractor', 'crew'];
      
      if (role) {
        if (Array.isArray(role)) {
          const validSelectedRoles = role.filter(r => validRoles.includes(r)) as Array<'admin' | 'user' | 'evaluator' | 'verifikator' | 'manager' | 'contractor' | 'crew'>;
          if (validSelectedRoles.length > 0) {
            conditions.push(inArray(users.role, validSelectedRoles));
          }
        } else if (validRoles.includes(role)) {
          conditions.push(eq(users.role, role as 'admin' | 'user' | 'evaluator' | 'verifikator' | 'manager' | 'contractor' | 'crew'));
        }
      }

      // Add search filter if provided (searches in email and name)
      if (search) {
        conditions.push(
          or(
            ilike(users.email, `%${search}%`),
            ilike(users.name, `%${search}%`)
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const totalCountResult = await db
        .select({ count: count() })
        .from(users)
        .where(whereClause);

      const total = Number(totalCountResult[0].count);
      const totalPages = Math.ceil(total / limitNumber);

      // Get paginated data
      const userList = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          emailVerified: users.emailVerified,
          banned: users.banned,
          image: users.image,
          signature: users.signature,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(whereClause)
        .limit(limitNumber)
        .offset(offset)
        .orderBy(users.createdAt);

      // Fetch sub-contractors and vessel information for contractor/crew users
      const userIds = userList.map(u => u.id);
      const userInfoMap = await getUsersWithSubContractorsAndVessels(userIds);

      const enhancedUserList = userList.map((u) => {
        const userInfo = userInfoMap[u.id] || { subContractors: [], vessel: null };
        
        // Add sub-contractors for contractors
        if (u.role === 'contractor') {
          return {
            ...u,
            subContractors: userInfo.subContractors,
          };
        }
        // Add both sub-contractors and vessel information for crew members
        else if (u.role === 'crew') {
          return {
            ...u,
            subContractors: userInfo.subContractors,
            vessel: userInfo.vessel,
          };
        }
        return u;
      });

      return reply.status(200).send({
        success: true,
        message: req.i18n.t('user.usersListed') || 'Users listed successfully',
        data: enhancedUserList,
        meta: {
          total,
          page: pageNumber,
          limit: limitNumber,
          totalPages,
        },
      });
    }),
  });
};

export default listUsersRoute;
