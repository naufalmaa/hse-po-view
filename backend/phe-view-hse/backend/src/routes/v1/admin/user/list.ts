import { Type } from '@sinclair/typebox';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { inArray, eq } from 'drizzle-orm';
import {withErrorHandler} from "../../../../utils/withErrorHandler.ts";
import { fromNodeHeaders } from 'better-auth/node';
import { getAuthInstance } from '../../../../decorators/auth.decorator.ts';
import { getUsersWithSubContractorsAndVessels } from '../../../../services/users/list.service.ts';
import { db } from '../../../../db/index.ts';
import { users, subContractors, vessels } from '../../../../db/schema/auth.schema.ts';
import { employees } from '../../../../db/schema/employee.schema.ts';

const listUserRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/list',
    method: 'GET',
    schema: {
      tags: ['Admin'],
      summary: 'List users',
      description: 'List all users. If user is contractor, show subContractors. If user is crew, show subContractors and vessel information.',
      querystring: Type.Object({
        page: Type.Optional(Type.Number()),
        limit: Type.Optional(Type.Number()),
        search: Type.Optional(Type.String()),
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean({ default: true }),
          message: Type.String(),
          data: Type.Array(Type.Any()),
          meta: Type.Optional(Type.Object({
            total: Type.Number(),
            page: Type.Number(),
            limit: Type.Number(),
            totalPages: Type.Number(),
          })),
          summary: Type.Optional(Type.Object({
            admin: Type.Number(),
            user: Type.Number(),
            contractor: Type.Number(),
            crew: Type.Number(),
            employee: Type.Number(),
          })),
        }),
        '4xx': Type.Object({
          success: Type.Boolean({ default: false }),
          message: Type.String(),
        }),
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      const auth = getAuthInstance(app);
      const { page, limit, search } = req.query as { 
              page?: number, 
              limit?: number, 
              search?: string 
            };

      try {
        // Get all users from database directly (no limit)
        const allDbUsers = await db.select().from(users);
        
        // Get all users from auth API (with high limit to get all)
        const allResult = await auth.api.listUsers({
          query: { limit: 10000 },
          headers: fromNodeHeaders(req.headers),
        });
        
        // Create auth user map for quick lookup
        const authUserMap = new Map((allResult.users ?? []).map(u => [u.id, u]));

        // Merge DB users with auth data - use DB as source of truth for count
        const allUsers = allDbUsers.map(dbUser => {
          const authUser = authUserMap.get(dbUser.id);
          return {
            id: dbUser.id,
            email: authUser?.email ?? dbUser.email,
            name: authUser?.name ?? dbUser.name,
            role: dbUser.role,
            hssePassportNumber: dbUser.hssePassportNumber,
            emailVerified: authUser?.emailVerified ?? dbUser.emailVerified,
            image: authUser?.image ?? dbUser.image,
            signature: dbUser.signature,
            createdAt: dbUser.createdAt,
            updatedAt: dbUser.updatedAt,
            banned: authUser?.banned ?? dbUser.banned,
            banReason: authUser?.banReason ?? dbUser.banReason,
            banExpires: authUser?.banExpires ?? dbUser.banExpires,
          };
        });
        
        // Apply search filter to all users
        let filteredUsers = allUsers;
        if (search) {
          filteredUsers = allUsers.filter(u => 
            (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
            (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
          );
        }

        // Calculate pagination based on filtered results
        const pageNum = page ?? 0;
        const limitNum = limit ?? 10;
        const offset = pageNum * limitNum;
        const total = filteredUsers.length;
        const totalPages = Math.ceil(total / limitNum);

        // Apply pagination to filtered users
        const paginatedUsers = filteredUsers.slice(offset, offset + limitNum);
        
        const userIds = paginatedUsers.map(u => u.id);
        
        // Fetch both sub-contractors and vessel information for paginated users
        const userInfoMap = await getUsersWithSubContractorsAndVessels(userIds);

        // Fetch hssePassportNumber for paginated users
        const hsseData = await db
          .select({
            id: users.id,
            hssePassportNumber: users.hssePassportNumber,
          })
          .from(users)
          .where(inArray(users.id, userIds));
        
        const hsseMap = Object.fromEntries(
          hsseData.map(h => [h.id, h.hssePassportNumber])
        );

        // Fetch employee data (subContractorId, vesselId) for users with 'employee' role
        // Users are linked to employees via hssePassportNumber
        const employeeData = await db
          .select({
            userId: users.id,
            subContractorId: employees.subContractorId,
            vesselId: employees.vesselId,
          })
          .from(users)
          .innerJoin(employees, eq(users.hssePassportNumber, employees.hssePassportNumber))
          .where(inArray(users.id, userIds));
        
        // Get subContractor names for employee users
        const subContractorIds = employeeData
          .filter(e => e.subContractorId)
          .map(e => e.subContractorId!);
        
        const subContractorMap: Record<string, { id: string; name: string }> = {};
        if (subContractorIds.length > 0) {
          const subContractorsData = await db
            .select({
              id: subContractors.id,
              name: subContractors.name,
            })
            .from(subContractors)
            .where(inArray(subContractors.id, subContractorIds));
          
          for (const sc of subContractorsData) {
            if (sc.id) {
              subContractorMap[sc.id] = { id: sc.id, name: sc.name || '' };
            }
          }
        }
        
        // Get vessel names for employee users
        const vesselIds = employeeData
          .filter(e => e.vesselId)
          .map(e => e.vesselId!);
        
        const vesselMap: Record<string, { id: string; name: string; type: string | null } | null> = {};
        if (vesselIds.length > 0) {
          const vesselsData = await db
            .select({
              id: vessels.id,
              name: vessels.vesselName,
              type: vessels.type,
            })
            .from(vessels)
            .where(inArray(vessels.id, vesselIds));
          
          for (const v of vesselsData) {
            if (v.id) {
              vesselMap[v.id] = { id: v.id, name: v.name || '', type: v.type };
            }
          }
        }
        
        // Build employee info map
        const employeeInfoMap: Record<string, {
          subContractors: { id: string; name: string }[];
          vessel: { id: string; name: string; type: string | null } | null;
        }> = {};
        
        for (const emp of employeeData) {
          const subContractorsList = emp.subContractorId && subContractorMap[emp.subContractorId]
            ? [subContractorMap[emp.subContractorId]]
            : [];
          const vessel = emp.vesselId ? vesselMap[emp.vesselId] || null : null;
          
          employeeInfoMap[emp.userId] = {
            subContractors: subContractorsList,
            vessel,
          };
        }

        const enhancedUsers = paginatedUsers.map((u) => {
          const userInfo = userInfoMap[u.id] || { subContractors: [], vessel: null };
          const hssePassportNumber = hsseMap[u.id] || null;
          
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
          // Add sub-contractors, vessel, and hssePassportNumber for employees
          // Employees get subContractors and vessel from employees table (subContractorId and vesselId)
          else if (u.role === 'employee') {
            const empInfo = employeeInfoMap[u.id] || { subContractors: [], vessel: null };
            return {
              ...u,
              subContractors: empInfo.subContractors,
              vessel: empInfo.vessel,
              hssePassportNumber,
            };
          }
          return {
            ...u,
          };
        });

        // Build meta based on whether pagination is provided
        const meta = (page !== undefined && limit !== undefined) ? {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages,
        } : {
          total,
          page: 0,
          limit: total,
          totalPages: 1,
        };

        // Get user count summary by role
        let summary = {};
        try {
          // Get all users from database to count by role
          const allUsers = await db.select({
            role: users.role
          }).from(users) as Array<{ role: string }>;
          
          // Count users by role
          const roleCounts: Record<string, number> = {};
          allUsers.forEach(user => {
            roleCounts[user.role] = (roleCounts[user.role] || 0) + 1;
          });
          
          summary = {
            admin: roleCounts.admin || 0,
            user: roleCounts.user || 0,
            contractor: roleCounts.contractor || 0,
            crew: roleCounts.crew || 0,
            employee: roleCounts.employee || 0,
          };
        } catch (summaryErr) {
          console.error('Error fetching user summary:', summaryErr);
          // Continue without summary if there's an error
        }

        return reply.status(200).send({
          success: true,
          message: req.i18n.t('admin.user.userListSuccess'),
          data: enhancedUsers,
          meta,
          summary,
        });
      } catch (err) {
        return reply.forbidden(req.i18n.t('admin.user.userListFailed'));
      }
    }),
  });
};

export default listUserRoute;