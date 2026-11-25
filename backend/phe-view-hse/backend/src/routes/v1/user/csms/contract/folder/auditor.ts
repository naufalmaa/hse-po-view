import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { withErrorHandler } from "../../../../../../utils/withErrorHandler.ts";
import { Type } from '@sinclair/typebox';
import { addUserIdToDepth0Folders, removeUserIdFromDepth0Folders } from "../../../../../../services/csms/contract/auditor.service.ts";

const bodySchema = Type.Object({
  contractId: Type.String({ format: 'uuid' }),
  userId: Type.String({ format: 'uuid' }),
  folderId: Type.Optional(Type.String({ format: 'uuid' })),
  action: Type.Union([
    Type.Literal('add'),
    Type.Literal('remove')
  ])
});

const addUseridRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/auditor',
    method: 'POST',
    schema: {
      tags: ['CSMS Contract'],
      summary: 'Add or remove userId to/from depth 0 folders',
      description: 'Add or remove a userId to/from all depth 0 folders in a contract, or target a specific folder',
      body: bodySchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          affectedFolders: Type.Integer()
        }),
        400: Type.Object({
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
      const { contractId, userId, folderId, action } = req.body as {
        contractId: string;
        userId: string;
        folderId?: string;
        action: 'add' | 'remove';
      };

      try {
        // Validate input
        if (!contractId) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.folder.contractIdRequired'),
          });
        }

        if (!userId) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.folder.userIdRequired'),
          });
        }

        if (!action) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.folder.actionRequired'),
          });
        }

        let result;
        if (action === 'add') {
          result = await addUserIdToDepth0Folders(contractId, userId, folderId);
        } else if (action === 'remove') {
          result = await removeUserIdFromDepth0Folders(contractId, userId, folderId);
        } else {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.folder.invalidAction'),
          });
        }

        return reply.status(200).send({
          success: result.success,
          message: result.message,
          affectedFolders: result.affectedFolders
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: error.message || req.i18n.t('user.csms.contract.folder.addUseridFailed'),
        });
      }
    })
  });
};

export default addUseridRoutes;