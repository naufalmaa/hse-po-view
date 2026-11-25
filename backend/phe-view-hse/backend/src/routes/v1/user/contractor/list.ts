import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import {
  getAllSubContractors,
  getSubContractorsByUserId,
} from "../../../../services/users/list.service.ts";
import { Type } from '@sinclair/typebox';

const ListContractor: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: "GET",
    url: "/list",
    schema: {
      tags: ["Contractors"],
      summary: "List all contractors (filtered by user role)",
      querystring: Type.Object({
        category: Type.Optional(Type.Array(Type.String())),
        page: Type.Optional(Type.Number()),
        limit: Type.Optional(Type.Number()),
        search: Type.Optional(Type.String()),
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Array(Type.Object({
            id: Type.String({ format: 'uuid' }),
            name: Type.String(),
            category: Type.Union([Type.String(), Type.Null()]),
            vessels: Type.Array(Type.Object({
              id: Type.String({ format: 'uuid' }),
              vesselName: Type.String(),
              type: Type.Union([Type.String(), Type.Null()]),
              personnelCount: Type.Union([Type.Number(), Type.Null()])
            }))
          })),
          meta: Type.Optional(Type.Object({
            total: Type.Number(),
            page: Type.Number(),
            limit: Type.Number(),
            totalPages: Type.Number(),
          }))
        }),
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      const user = req.session.user;
      const { category, page, limit, search } = req.query as { 
        category?: string[], 
        page?: number, 
        limit?: number, 
        search?: string 
      };

      let result;
      if (user.role === 'contractor') {
        result = await getSubContractorsByUserId(user.id, page, limit, search);
        
        const { db } = await import('../../../../db/index.ts');
        const { userContractors, vessels, contractorVessels } = await import('../../../../db/schema/auth.schema.ts');
        const { eq, inArray } = await import('drizzle-orm');

        const userContractorMappings = await db
          .select({
            contractorId: userContractors.contractorId,
            vesselId: userContractors.vesselId,
          })
          .from(userContractors)
          .where(eq(userContractors.userId, user.id));

        const mappedVesselIds = userContractorMappings.map(m => m.vesselId).filter((id): id is string => !!id);

        let vesselDetails: any[] = [];
        if (mappedVesselIds.length > 0) {
          vesselDetails = await db
            .select({
              id: vessels.id,
              vesselName: vessels.vesselName,
              type: vessels.type,
              personnelCount: vessels.personnelCount,
            })
            .from(vessels)
            .where(inArray(vessels.id, mappedVesselIds));
        }

        const allowedContractorIds = result.data.map(s => s.id);
        let allCompanyVessels: any[] = [];
        if (allowedContractorIds.length > 0) {
          allCompanyVessels = await db
            .select({
              contractorId: contractorVessels.contractorId,
              vesselId: vessels.id,
              vesselName: vessels.vesselName,
              type: vessels.type,
              personnelCount: vessels.personnelCount,
            })
            .from(contractorVessels)
            .innerJoin(vessels, eq(contractorVessels.vesselId, vessels.id))
            .where(inArray(contractorVessels.contractorId, allowedContractorIds));
        }

        const data = result.data.map(subcontractor => {
          const subVesselIds = userContractorMappings
            .filter(m => m.contractorId === subcontractor.id && m.vesselId)
            .map(m => m.vesselId);
          
          let subcontractorVessels = [];
          if (subVesselIds.length > 0) {
            subcontractorVessels = vesselDetails.filter(v => subVesselIds.includes(v.id));
          } else {
            // Fallback: show all vessels belonging to this subcontractor
            subcontractorVessels = allCompanyVessels
              .filter(v => v.contractorId === subcontractor.id)
              .map(v => ({
                id: v.vesselId,
                vesselName: v.vesselName,
                type: v.type,
                personnelCount: v.personnelCount,
              }));
          }

          return {
            id: subcontractor.id,
            name: subcontractor.name,
            category: subcontractor.category || null,
            vessels: subcontractorVessels,
          };
        });
        
        return reply.status(200).send({ 
          success: true, 
          message: req.i18n.t('user.contractor.contractorsListed'),
          data,
          meta: result.meta
        });
      } else {
        result = await getAllSubContractors(category, page, limit, search);
        
        return reply.status(200).send({ 
          success: true, 
          message: req.i18n.t('user.contractor.contractorsListed'),
          data: result.data,
          meta: result.meta
        });
      }
    }),
  });
};

export default ListContractor;