import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { getContractorByVesselId } from '../../../../services/users/contractor-vessel.service.ts';
import { Type } from '@sinclair/typebox';

interface GetContractorByVesselParams {
  vesselId: string;
}

const getContractorByVesselRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/get-contractor/:vesselId',
    method: 'GET',
    schema: {
      tags: ['Contractor Vessel'],
      summary: 'Get contractor by vessel ID',
      params: {
        type: 'object',
        required: ['vesselId'],
        properties: {
          vesselId: { type: 'string' },
        },
      },
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Any(),
        }),
        404: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      // Anyone can get contractor by vessel ID
      const { vesselId } = req.params as GetContractorByVesselParams;

      const contractor = await getContractorByVesselId(vesselId);

      if (!contractor) {
        return reply.status(404).send({ 
          success: false, 
          message: req.i18n.t('user.contractorVessel.noContractorFound'),
        });
      }

      return reply.status(200).send({ 
        success: true, 
        message: req.i18n.t('user.contractorVessel.contractorFound'), 
        data: contractor 
      });
    }),
  });
};

export default getContractorByVesselRoute;