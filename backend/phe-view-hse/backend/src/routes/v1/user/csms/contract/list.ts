import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { withErrorHandler } from "../../../../../utils/withErrorHandler.ts";
import { listAllContracts } from "../../../../../services/csms/contract/list.service.ts";
import type { ListContractsParams } from "../../../../../types/contract.ts";
import { mapRoleToApprovalLevel } from "../../../../../services/csms/contract/approval.service.ts";
import { Type } from '@sinclair/typebox';
import { db } from '../../../../../db/index.ts';
import { users, userContractors } from '../../../../../db/schema/auth.schema.ts';
import { eq } from 'drizzle-orm';
import type { User } from '../../../../../auth.ts';
import { convertDeepTimestampsToWIB } from '../../../../../utils/timezone.ts';

const listContractsRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/contracts',
    method: 'POST',
    schema: {
      tags: ['CSMS Contract'],
      summary: 'List all contracts',
      description: 'List all contracts with basic information and assessment metrics',
      body: Type.Optional(Type.Object({
        search: Type.Optional(Type.String()),
        subContractorId: Type.Optional(Type.Array(Type.String())),
        sort: Type.Optional(Type.Union([
          Type.Literal('title'),
          Type.Literal('contractorName'),
          Type.Literal('startDate'),
          Type.Literal('endDate'),
          Type.Literal('createdAt'),
          Type.Literal('updatedAt')
        ])),
        order: Type.Optional(Type.Union([
          Type.Literal('asc'),
          Type.Literal('desc')
        ])),
        page: Type.Optional(Type.Number()),
        view: Type.Optional(Type.Number()),
        status: Type.Optional(Type.Union([
          Type.Literal('waiting'),
          Type.Literal('complete'),
          Type.Literal('rejected'),
          Type.Literal('')
        ]))
      })),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          data: Type.Any(),
          overallMetrics: Type.Any(),
          approvalMetrics: Type.Any(),
          meta: Type.Any(),
          message: Type.String()
        })
      }
    },
    handler: withErrorHandler(async (req, reply) => {
      // Get user from session
      const sessionUser = req.session.user;
      if (!sessionUser) {
        return reply.status(401).send({ 
          success: false,
          message: req.i18n.t('auth.unauthorized')
        });
      }

      const userId = sessionUser.id;
      const [dbUser] = await db.select().from(users).where(eq(users.id, userId));

      if (!dbUser) {
        return reply.status(401).send({ 
          success: false,
          message: req.i18n.t('auth.userNotFoundInDb')
        });
      }

      // If user is a contractor, filter by their subcontractor IDs
      let effectiveParams: ListContractsParams = { ...(req.body || {}) };
      if (dbUser.role === 'contractor') {
        // Get subcontractor IDs associated with this user
        const userSubcontractors = await db
          .select({ contractorId: userContractors.contractorId })
          .from(userContractors)
          .where(eq(userContractors.userId, userId));
        
        const subcontractorIds = userSubcontractors.map(item => item.contractorId);
        
        // Use subcontractor IDs for filtering, ignoring any subContractorId from request body
        effectiveParams.subContractorId = subcontractorIds.length > 0 ? subcontractorIds : [];
      }

      // Get approval level automatically from the logged-in user's role
      const approvalLevel = mapRoleToApprovalLevel(dbUser.role) || undefined;

      // Cast dbUser to User type to handle email nullability mismatch
      const data = await listAllContracts(effectiveParams, dbUser as unknown as User, approvalLevel, userId);

      return reply.send({ 
        success: true, 
        data: convertDeepTimestampsToWIB(data.data),
        overallMetrics: data.overallMetrics,
        approvalMetrics: data.approvalMetrics,
        meta: data.meta,
        message: req.i18n.t('user.csms.contract.contractsListed')
      });
    }, 500),
  });
};

export default listContractsRoutes;