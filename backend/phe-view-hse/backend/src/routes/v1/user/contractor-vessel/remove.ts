import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { removeVesselFromContractor } from '../../../../services/users/contractor-vessel.service.ts';
import { Type } from '@sinclair/typebox';

interface RemoveVesselFromContractorBody {
  contractorId: string;
  vesselId: string;
}

const removeVesselFromContractorRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/remove',
    method: 'POST',
    schema: {
      tags: ['Contractor Vessel'],
      summary: 'Remove a vessel from a contractor',
      body: Type.Object({
        contractorId: Type.String(),
        vesselId: Type.String(),
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
        400: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
        403: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      const user = req.session.user;
      
      // Check if user has permission to remove vessels
      if (user.role !== 'admin' && user.role !== 'user') {
        return reply.status(403).send({ 
          success: false, 
          message: req.i18n.t('auth.unauthorized') 
        });
      }

      const { contractorId, vesselId } = req.body as RemoveVesselFromContractorBody;

      const result = await removeVesselFromContractor({ contractorId, vesselId });

      if (!result || !result.success) {
        return reply.status(400).send({ 
          success: false, 
          message: result?.error || req.i18n.t('user.contractorVessel.vesselRemoveFailed') 
        });
      }

      return reply.send({ 
        success: true, 
        message: req.i18n.t('user.contractorVessel.vesselRemoved'),
        contractorId,
        vesselId
      });
    }),
  });
};

export default removeVesselFromContractorRoute;