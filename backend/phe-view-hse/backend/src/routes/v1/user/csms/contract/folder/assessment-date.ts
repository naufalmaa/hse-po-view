import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { withErrorHandler } from "../../../../../../utils/withErrorHandler.ts";
import { Type } from '@sinclair/typebox';
import { updateAssessmentDateForDepth0Folders } from "../../../../../../services/csms/contract/assessment-date.service.ts";

const bodySchema = Type.Object({
  contractId: Type.String({ format: 'uuid' }),
  folderId: Type.Optional(Type.String({ format: 'uuid' })),
  assessmentDate: Type.String({ format: 'date-time' })
});

const assessmentDateRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/assessment-date',
    method: 'POST',
    schema: {
      tags: ['CSMS Contract'],
      summary: 'Update assessmentDate for depth 0 folders',
      description: 'Update the assessmentDate for all depth 0 folders in a contract, or target a specific folder',
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
      const { contractId, folderId, assessmentDate } = req.body as {
        contractId: string;
        folderId?: string;
        assessmentDate: string;
      };

      try {
        if (!contractId) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.folder.contractIdRequired'),
          });
        }

        if (!assessmentDate) {
          return reply.status(400).send({
            success: false,
            message: 'assessmentDate is required',
          });
        }

        const date = new Date(assessmentDate);
        if (isNaN(date.getTime())) {
          return reply.status(400).send({
            success: false,
            message: 'Invalid assessmentDate format',
          });
        }

        const result = await updateAssessmentDateForDepth0Folders(contractId, date, folderId);

        return reply.status(200).send({
          success: result.success,
          message: result.message,
          affectedFolders: result.affectedFolders
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: error.message || 'Failed to update assessmentDate',
        });
      }
    })
  });
};

export default assessmentDateRoutes;
