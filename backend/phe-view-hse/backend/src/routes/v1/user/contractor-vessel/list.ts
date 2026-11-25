import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { listAllContractorVessels } from '../../../../services/users/contractor-vessel.service.ts';
import type {ListContractorsVesselsParams} from "../../../../types/user.ts";
import { Type } from '@sinclair/typebox';

const listAllContractorVesselsRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'POST',
    url: '/list',
    schema: {
      tags: ['Contractor Vessel'],
      summary: 'List all contractor vessels with pagination, sorting, filtering',
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Any(),
          meta: Type.Any()
        }),
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      const result = await listAllContractorVessels (req.body as ListContractorsVesselsParams);
      return reply.send({ 
        success: true, 
        message: req.i18n.t('user.contractorVessel.vesselsListed'),
        data: result.data,
        meta: result.meta
      });
    }, 500),
  });
};

export default listAllContractorVesselsRoute;