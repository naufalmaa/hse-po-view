import type {FastifyPluginAsyncTypebox} from "@fastify/type-provider-typebox";
import {withErrorHandler} from "../../../../../../utils/withErrorHandler.ts";
import {Type} from '@sinclair/typebox';
import { listContractFolders } from "../../../../../../services/csms/contract/list-contract-folders.service.ts";
const contractFoldersQuerySchema = Type.Object({
  contractId: Type.String({format: 'uuid'}),
});

const listContractFoldersRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/contract-folders',
    method: 'GET',
    schema: {
      tags: ['CSMS Contract'],
      summary: 'List contract folders',
      description: 'List all folders for a contract with ltree structure',
      querystring: contractFoldersQuerySchema,
    },
    handler: withErrorHandler(async (req, reply) => {
      const { contractId } = req.query as { 
        contractId: string;
      };

      try {        
        const result = await listContractFolders(contractId);
        
        return reply.status(200).send({
          success: true,
          message: req.i18n.t('user.csms.contract.folder.foldersListed'),
          data: result.folderTree,
          contract: result.contract
        });
      } catch (error: any) {
        if (error.message === 'Contract not found') {
          return reply.status(404).send({
            success: false,
            message: req.i18n.t('user.csms.contract.folder.contractNotFound'),
          });
        }
        
        return reply.status(500).send({
          success: false,
          message: error.message || req.i18n.t('user.csms.contract.folder.folderListFailed'),
        });
      }
    })
  });

};

export default listContractFoldersRoutes;