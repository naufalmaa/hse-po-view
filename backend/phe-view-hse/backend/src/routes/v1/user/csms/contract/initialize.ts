import type {FastifyPluginAsyncTypebox} from "@fastify/type-provider-typebox";
import {withErrorHandler} from "../../../../../utils/withErrorHandler.ts";
import {Type} from '@sinclair/typebox';
import {initializeContractStructure} from "../../../../../services/csms/contract/initialization.service.ts";

const bodySchema = Type.Object({
  contractId: Type.String({format: 'uuid'}),
});

const initializeContractRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/initialize-contract',
    method: 'POST',
    schema: {
      tags: ['CSMS Contract'],
      summary: 'Initialize contract folder structure',
      description: 'Initialize the complete folder structure for a contract including assessment dates and K3LL structure',
      body: bodySchema,
    },
    handler: withErrorHandler(async (req, reply) => {
      const { contractId } = req.body as { contractId: string };

      try {
        const result = await initializeContractStructure(contractId);
        
        return reply.status(200).send({
          success: true,
          message: req.i18n.t('user.csms.contract.contractInitialized'),
          data: result,
        });
      } catch (error: any) {
        if (error.message.includes("not found")) {
          return reply.status(404).send({
            success: false,
            message: req.i18n.t('user.csms.contract.contractNotFound') + ': ' + error.message,
          });
        }
        
        return reply.status(500).send({
          success: false,
          message: error.message || req.i18n.t('user.csms.contract.contractInitializeFailed'),
        });
      }
    })
  });
};

export default initializeContractRoutes;