import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { withErrorHandler } from "../../../../../../utils/withErrorHandler.ts";
import { Type } from '@sinclair/typebox';
import { db } from "../../../../../../db/index.ts";
import { contractFolder } from "../../../../../../db/schema/csms.schema.ts";
import { eq } from "drizzle-orm";
import { convertUTCToWIB } from "../../../../../../utils/timezone.ts";

const querySchema = Type.Object({
  folderId: Type.String({ format: 'uuid' }),
});

const getFolderDetailsRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/folder-details',
    method: 'GET',
    schema: {
      tags: ['CSMS Contract'],
      summary: 'Get folder details',
      description: 'Get details of a specific folder including name and description',
      querystring: querySchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({
            id: Type.String({ format: 'uuid' }),
            name: Type.String(),
            description: Type.String(),
            fileType: Type.String(),
            createdAt: Type.String({ format: 'date-time' }),
            updatedAt: Type.String({ format: 'date-time' })
          })
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
      const { folderId } = req.query as { folderId: string };

      try {
        // Validate input
        if (!folderId) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.folder.folderIdRequired'),
          });
        }

        // Get folder details
        const folder = await db.query.contractFolder.findFirst({
          where: eq(contractFolder.id, folderId),
        });

        if (!folder) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.folder.folderNotFound'),
          });
        }

        return reply.status(200).send({
          success: true,
          message: req.i18n.t('user.csms.contract.folder.folderDetailsRetrieved'),
          data: {
            id: folder.id,
            name: folder.name,
            description: folder.description || '',
            fileType: folder.fileType || '',
            createdAt: convertUTCToWIB(folder.createdAt),
            updatedAt: convertUTCToWIB(folder.updatedAt)
          }
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: error.message || req.i18n.t('user.csms.contract.folder.folderNotFound'),
        });
      }
    })
  });
};

export default getFolderDetailsRoutes;