import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { withErrorHandler } from "../../../../../../utils/withErrorHandler.ts";
import { Type } from '@sinclair/typebox';
import { generateSingleAssessmentFolder } from "../../../../../../services/csms/contract/initialization.service.ts";
import { checkContractFolderNotifications } from "../../../../../../services/csms/notification.service.ts";

const bodySchema = Type.Object({
  contractId: Type.String({ format: 'uuid' }),
  assessmentType: Type.Union([Type.Literal('final'), Type.Literal('ongoing')]),
  assessmentDate: Type.String({ format: 'date' }),
});

const generateAssessmentFolderRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/generate-assessment-folder',
    method: 'POST',
    schema: {
      tags: ['CSMS Contract'],
      summary: 'Generate a single assessment folder',
      description: 'Generate a single assessment folder (PB or PA) for a contract and update contract dates',
      body: bodySchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
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
      const { contractId, assessmentType, assessmentDate } = req.body as {
        contractId: string;
        assessmentType: 'final' | 'ongoing';
        assessmentDate: string;
      };

      try {
        const result = await generateSingleAssessmentFolder(
          contractId,
          assessmentType,
          assessmentDate
        );
        
        if (result.success) {
          // Call notification check after successfully generating the folder
          try {
            await checkContractFolderNotifications();
          } catch (notificationError) {
            console.error('Error checking contract folder notifications:', notificationError);
            // Don't fail the request if notification check fails
          }
          
          return reply.status(200).send({
            success: true,
            message: req.i18n.t('user.csms.contract.folder.assessmentFolderGenerated'),
          });
        } else {
          return reply.status(500).send({
            success: false,
            message: req.i18n.t('user.csms.contract.folder.assessmentFolderGenerateFailed'),
          });
        }
      } catch (error: any) {
        if (error.message.includes("not found")) {
          return reply.status(400).send({
            success: false,
            message: error.message,
          });
        }
        
        return reply.status(500).send({
          success: false,
          message: error.message || req.i18n.t('user.csms.contract.folder.assessmentFolderGenerateFailed'),
        });
      }
    })
  });
};

export default generateAssessmentFolderRoutes;