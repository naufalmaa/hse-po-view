import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { getOngoingActivities, getIncomingActivities } from "../../../../services/csms/dashboard.service.ts";
import { withErrorHandler } from "../../../../utils/withErrorHandler.ts";
import { Type } from '@sinclair/typebox';
import { db } from "../../../../db/index.ts";
import { contract } from "../../../../db/schema/csms.schema.ts";
import { subContractors, userContractors } from "../../../../db/schema/auth.schema.ts";
import { and, inArray, or, sql, eq } from "drizzle-orm";

// Updated SuccessResponse schema to include contractorName and contractTitle
const SuccessResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Array(Type.Object({
    id: Type.String(),
    folderId: Type.String(),
    folderName: Type.String(),
    contractId: Type.String(),
    action: Type.String(),
    timestamp: Type.Any(),
    user: Type.String(),
    details: Type.String(),
    contractorName: Type.Optional(Type.String()),
    contractTitle: Type.Optional(Type.String())
  })),
  meta: Type.Object({
    total: Type.Number(),
    folderCount: Type.Optional(Type.Number()),
    page: Type.Number(),
    view: Type.Number(),
    totalPages: Type.Number(),
  }),
});

const ErrorResponse = Type.Object({
  success: Type.Optional(Type.Boolean()),
  message: Type.String()
});

const ActivitiesQuerySchema = Type.Object({
  year: Type.Optional(Type.Union([Type.Number(), Type.Array(Type.Number())])),
  contractorId: Type.Optional(Type.Union([Type.String(), Type.Array(Type.String())])),
  page: Type.Optional(Type.Number({ minimum: 0, default: 0 })),
  limit: Type.Optional(Type.Number({ minimum: 1 }))
});

const activitiesRoute: FastifyPluginAsyncTypebox = async (app) => {
  // Get ongoing activities details
  app.route({
    method: 'POST',
    url: '/activities/ongoing',
    schema: {
      description: "Get detailed ongoing activities",
      tags: ["CSMS Activities"],
      body: ActivitiesQuerySchema,
      response: {
        200: SuccessResponse,
        500: ErrorResponse
      }
    },
    handler: withErrorHandler(async (req, reply) => {
      try {
        // Get user from session
        const user = req.session.user;
        if (!user) {
          return reply.status(401).send({ 
            success: false,
            message: req.i18n.t('auth.unauthorized') 
          });
        }
        
        const { year, contractorId, page = 0, limit = 20 } = req.body as { 
          year?: number | number[], 
          contractorId?: string | string[],
          page?: number,
          limit?: number
        };
        
        // If user is a contractor, filter by their subcontractor IDs
        let effectiveContractorId = contractorId;
        if (user.role === 'contractor') {
          // Get subcontractor IDs associated with this user
          const userSubcontractors = await db
            .select({ contractorId: userContractors.contractorId })
            .from(userContractors)
            .where(eq(userContractors.userId, user.id));
          
          const subcontractorIds = userSubcontractors.map(item => item.contractorId);
          
          // Use subcontractor IDs for filtering, ignoring any contractorId from request body
          effectiveContractorId = subcontractorIds.length > 0 ? subcontractorIds : [];
        }
        
        const years = year ? (Array.isArray(year) ? year : [year]) : [];
        
        // Build conditions for filtering contracts
        const conditions = [];
        
        // Add year condition if provided
        if (years.length > 0) {
          const yearConditions = years.map(y => 
            sql`(${y} BETWEEN EXTRACT(YEAR FROM ${contract.startDate}) AND EXTRACT(YEAR FROM ${contract.endDate}))`
          );
          conditions.push(or(...yearConditions));
        }
        
        // Add contractor ID condition if provided
        if (effectiveContractorId) {
          const contractorIds = Array.isArray(effectiveContractorId) ? effectiveContractorId : [effectiveContractorId];
          if (contractorIds.length > 0) {
            conditions.push(inArray(contract.contractorId, contractorIds));
          }
        }
        
        // Get contract IDs based on filters
        const filteredContracts = await db.query.contract.findMany({
          where: conditions.length > 0 ? and(...conditions) : undefined
        });
        
        const filteredContractIds = filteredContracts.map(c => c.id);
        
        // Get ongoing activities for filtered contracts (pagination optional)
        const activitiesResult = await getOngoingActivities(filteredContractIds, years, page, limit);
        
        // Enrich activities with contractorName and contractTitle
        const enrichedData = await enrichActivitiesWithContractInfo(activitiesResult.data);
        
        return reply.status(200).send({
          success: true,
          message: req.i18n.t('user.csms.activities.ongoingRetrieved'),
          data: enrichedData,
          meta: activitiesResult.meta
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: req.i18n.t('user.csms.activities.retrieveFailed') + ': ' + (error.message || 'Unknown error')
        });
      }
    }),
  });

  // Get incoming activities details
  app.route({
    method: 'POST',
    url: '/activities/incoming',
    schema: {
      description: "Get detailed incoming activities",
      tags: ["CSMS Activities"],
      body: ActivitiesQuerySchema,
      response: {
        200: SuccessResponse,
        500: ErrorResponse
      }
    },
    handler: withErrorHandler(async (req, reply) => {
      try {
        // Get user from session
        const user = req.session.user;
        if (!user) {
          return reply.status(401).send({ 
            success: false,
            message: req.i18n.t('auth.unauthorized') 
          });
        }
        
        const { year, contractorId, page, limit } = req.body as { 
          year?: number | number[], 
          contractorId?: string | string[],
          page?: number,
          limit?: number
        };
        
        // If user is a contractor, filter by their subcontractor IDs
        let effectiveContractorId = contractorId;
        if (user.role === 'contractor') {
          // Get subcontractor IDs associated with this user
          const userSubcontractors = await db
            .select({ contractorId: userContractors.contractorId })
            .from(userContractors)
            .where(eq(userContractors.userId, user.id));
          
          const subcontractorIds = userSubcontractors.map(item => item.contractorId);
          
          // Use subcontractor IDs for filtering, ignoring any contractorId from request body
          effectiveContractorId = subcontractorIds.length > 0 ? subcontractorIds : [];
        }
        
        const years = year ? (Array.isArray(year) ? year : [year]) : [];
        
        // Build conditions for filtering contracts
        const conditions = [];
        
        // Add year condition if provided
        if (years.length > 0) {
          const yearConditions = years.map(y => 
            sql`(${y} BETWEEN EXTRACT(YEAR FROM ${contract.startDate}) AND EXTRACT(YEAR FROM ${contract.endDate}))`
          );
          conditions.push(or(...yearConditions));
        }
        
        // Add contractor ID condition if provided
        if (effectiveContractorId) {
          const contractorIds = Array.isArray(effectiveContractorId) ? effectiveContractorId : [effectiveContractorId];
          if (contractorIds.length > 0) {
            conditions.push(inArray(contract.contractorId, contractorIds));
          }
        }
        
        // Get contract IDs based on filters
        const filteredContracts = await db.query.contract.findMany({
          where: conditions.length > 0 ? and(...conditions) : undefined
        });
        
        const filteredContractIds = filteredContracts.map(c => c.id);
        
        // Get incoming activities for filtered contracts (pagination optional)
        const activitiesResult = await getIncomingActivities(filteredContractIds, years, page, limit);
        
        // Enrich activities with contractorName and contractTitle
        const enrichedData = await enrichActivitiesWithContractInfo(activitiesResult.data);
        
        return reply.status(200).send({
          success: true,
          message: req.i18n.t('user.csms.activities.incomingRetrieved'),
          data: enrichedData,
          meta: activitiesResult.meta
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: req.i18n.t('user.csms.activities.retrieveFailed') + ': ' + (error.message || 'Unknown error')
        });
      }
    }),
  });
};

// Helper function to enrich activities with contractorName and contractTitle
async function enrichActivitiesWithContractInfo(activities: any[]) {
  if (activities.length === 0) return activities;
  
  // Get unique contract IDs from activities
  const contractIds = [...new Set(activities.map(activity => activity.contractId))];
  
  // Fetch contracts with contractor info using a join
  const contracts = await db.select({
    id: contract.id,
    title: contract.title,
    contractorId: contract.contractorId,
    contractorName: subContractors.name
  })
  .from(contract)
  .leftJoin(subContractors, sql`${contract.contractorId} = ${subContractors.id}`)
  .where(inArray(contract.id, contractIds));
  
  // Create a map for quick lookup
  const contractMap = new Map(contracts.map(c => [c.id, c]));
  
  // Enrich activities with contractorName and contractTitle
  return activities.map(activity => {
    const contractInfo = contractMap.get(activity.contractId);
    return {
      ...activity,
      contractorName: contractInfo?.contractorName,
      contractTitle: contractInfo?.title
    };
  });
}

export default activitiesRoute;