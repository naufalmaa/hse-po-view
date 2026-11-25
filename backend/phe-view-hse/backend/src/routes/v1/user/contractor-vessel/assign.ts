import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { assignVesselsToContractor } from '../../../../services/users/contractor-vessel.service.ts';
import { Type } from '@sinclair/typebox';

// New interface for bulk assignment
interface AssignVesselsToContractorBody {
  contractorId: string;
  vesselId: string[];
}

const assignVesselToContractorRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/assign',
    method: 'POST',
    schema: {
      tags: ['Contractor Vessel'],
      summary: 'Assign a vessel or multiple vessels to a contractor',
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Optional(Type.Any()),
        }),
        403: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
        400: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      const user = req.session.user;
      
      // Check if user has permission to assign vessels
      if (user.role !== 'admin' && user.role !== 'user') {
        return reply.status(403).send({ 
          success: false, 
          message: req.i18n.t('auth.unauthorized') 
        });
      }

      const { contractorId, vesselId } = req.body as AssignVesselsToContractorBody;

      // Handle multiple vessels assignment
      if (vesselId && Array.isArray(vesselId)) {
        const result = await assignVesselsToContractor({ contractorId, vesselId });

        if (!result) {
          return reply.status(400).send({ 
            success: false, 
            message: req.i18n.t('user.contractorVessel.vesselAssignFailed') 
          });
        }

        return reply.status(200).send({
          success: true, 
          message: req.i18n.t('user.contractorVessel.vesselsAssigned'),
          data: result.result,
        });
      }

      // If neither vesselId nor vesselIds provided
      return reply.status(400).send({ 
        success: false, 
        message: req.i18n.t('user.contractorVessel.invalidRequest') 
      });
    }),
  });
};

export default assignVesselToContractorRoute;