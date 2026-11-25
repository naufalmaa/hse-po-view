import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { withErrorHandler } from "../../../../../utils/withErrorHandler.ts";
import { Type } from '@sinclair/typebox';
import { deleteContract } from "../../../../../services/csms/contract/delete.service.ts";

const paramsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

const deleteContractRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/contracts/:id',
    method: 'DELETE',
    schema: {
      tags: ['CSMS Contract'],
      summary: 'Delete a contract',
      description: 'Delete a contract and all associated folders and files',
      params: paramsSchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          contractId: Type.String({ format: 'uuid' })
        }),
        404: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        }),
        500: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        })
      }
    },
    handler: withErrorHandler(async (req, reply) => {
      const { id } = req.params as { id: string };

      try {
        // Delete the contract and all associated data
        const result = await deleteContract(id);
        
        return reply.status(200).send({
          ...result,
          message: req.i18n.t('user.csms.contract.contractDeleted')
        });
      } catch (error: any) {
        console.error('Error deleting contract:', error);
        if (error.message.includes("not found")) {
          return reply.status(404).send({
            success: false,
            message: req.i18n.t('user.csms.contract.contractNotFound'),
          });
        }
        
        // Return the actual error message for better debugging
        return reply.status(500).send({
          success: false,
          message: error.message || req.i18n.t('user.csms.contract.contractDeleteFailed'),
        });
      }
    })
  });
};

export default deleteContractRoutes;