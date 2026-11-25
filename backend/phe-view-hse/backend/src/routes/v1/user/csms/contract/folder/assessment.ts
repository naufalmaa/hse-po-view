import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { withErrorHandler } from "../../../../../../utils/withErrorHandler.ts";
import { Type } from '@sinclair/typebox';
import { updateFolderAssessment, getAssessmentDetails } from "../../../../../../services/csms/contract/assessment.service.ts";
import { saveAiFeedback } from "../../../../../../services/csms/contract/ai-quality.service.ts";

const bodySchema = Type.Object({
  folderId: Type.String({ format: 'uuid' }),
  status: Type.Enum({ pending: 'pending', accept: 'accept', reject: 'reject', revision: 'revision' }),
  score: Type.Optional(Type.Integer({ minimum: -1, maximum: 10 })), // Values should be -1, 0, 3, 6, 10
  note: Type.Optional(Type.String()),
  // admin: why the evaluator's score differs from the AI score (shown to the AI jurors in later runs)
  aiFeedback: Type.Optional(Type.String({ maxLength: 4000 })),
});

const assessmentUpdateRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/assessment',
    method: 'POST',
    schema: {
      tags: ['CSMS Contract Assessment'],
      summary: 'Update folder assessment (status, score, note)',
      description: 'Update assessment details for a folder. Score must be one of: -1, 0, 3, 6, 10. Admin and user roles can update assessments. Scores automatically accumulate to parent folders.',
      body: bodySchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({
            id: Type.String(),
            name: Type.String(),
            status: Type.String(),
            score: Type.Number(),
            note: Type.Optional(Type.String()),
            fileType: Type.String(),
            depth: Type.Optional(Type.Number()),
            parentId: Type.Optional(Type.String()),
            updatedAt: Type.String(),
          }),
        }),
        400: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        }),
        403: Type.Object({
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
      const { folderId, status, score, note, aiFeedback } = req.body as {
        folderId: string;
        status: 'pending' | 'accept' | 'reject' | 'revision';
        score?: number;
        note?: string;
        aiFeedback?: string;
      };

      try {
        // Check user role - only admin and user roles can update assessments
        const session = (req as any).session;
        if (!session?.user) {
          return reply.status(403).send({
            success: false,
            message: req.i18n.t('auth.unauthorized'),
          });
        }

        // Allow admin and user roles only
        if (!['admin', 'user'].includes(session.user.role)) {
          return reply.status(403).send({
            success: false,
            message: req.i18n.t('user.csms.contract.assessment.insufficientPermission'),
          });
        }

        // Validate input
        if (!folderId) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.assessment.folderIdRequired'),
          });
        }

        // Validate score values if provided
        if (score !== undefined && ![-1, 0, 3, 6, 10].includes(score)) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.assessment.invalidScore'),
          });
        }

        // Ensure at least one field is being updated
        if (status === undefined && score === undefined && note === undefined) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.assessment.atLeastOneFieldRequired'),
          });
        }

        // Update assessment
        await updateFolderAssessment({
          folderId,
          status,
          score,
          note,
          updatedBy: session.user.id,
        });

        // Correction for the AI (admin only; ignored when the score equals the AI score)
        if (aiFeedback?.trim() && score !== undefined && session.user.role === 'admin') {
          await saveAiFeedback(folderId, score, aiFeedback, session.user.id).catch((e) =>
            console.error('Error saving AI feedback:', e));
        }

        // Get assessment details
        const assessmentDetails = await getAssessmentDetails(folderId);

        return reply.status(200).send({
          success: true,
          message: req.i18n.t('user.csms.contract.assessment.assessmentUpdated'),
          data: assessmentDetails,
        });
      } catch (error: any) {
        console.error('Error updating assessment:', error);
        
        if (error.message.includes('Folder with ID') && error.message.includes('not found')) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.assessment.folderNotFound'),
          });
        }

        return reply.status(500).send({
          success: false,
          message: error.message || req.i18n.t('user.csms.contract.assessment.assessmentUpdateFailed'),
        });
      }
    })
  });
};

export default assessmentUpdateRoutes;
