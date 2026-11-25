import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { withErrorHandler } from "../../../../../../utils/withErrorHandler.ts";
import { Type } from '@sinclair/typebox';
import {
  submitApproval,
  getApprovalSummary,
  mapRoleToApprovalLevel
} from "../../../../../../services/csms/contract/approval.service.ts";

const bodySchema = Type.Object({
  folderId: Type.String({ format: 'uuid' }),
  contractId: Type.String({ format: 'uuid' }),
  status: Type.Union([
    Type.Literal('approved'),
    Type.Literal('rejected')
  ]),
  note: Type.Optional(Type.String({ maxLength: 1000 })),
});

const submitApprovalRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/submit-approval',
    method: 'POST',
    schema: {
      tags: ['CSMS Contract'],
      summary: 'Submit hierarchical approval for depth 0 folder',
      description: 'Submit approval at evaluator, verifikator, or manager level for a depth 0 folder. Approval level is determined by the logged-in user\'s role. Jenjang: evaluator → verifikator → manager',
      body: bodySchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({
            approvalId: Type.String({ format: 'uuid' }),
            folderId: Type.String({ format: 'uuid' }),
            approvalLevel: Type.String(),
            status: Type.String(),
            approvedAt: Type.String({ format: 'date-time' }),
            currentSummary: Type.Object({
              currentApprovalLevel: Type.Union([
                Type.Literal('evaluator'),
                Type.Literal('verifikator'),
                Type.Literal('manager'),
                Type.Null()
              ]),
              nextRequiredLevel: Type.Union([
                Type.Literal('evaluator'),
                Type.Literal('verifikator'),
                Type.Literal('manager'),
                Type.Null()
              ]),
              isFullyApproved: Type.Boolean(),
            })
          })
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
      const { folderId, contractId, status, note } = req.body as {
        folderId: string;
        contractId: string;
        status: 'approved' | 'rejected';
        note?: string;
      };

      try {
        // Get user session
        const session = (req as any).session;
        if (!session?.user) {
          return reply.status(403).send({
            success: false,
            message: req.i18n.t('auth.unauthorized'),
          });
        }

        const userId = session.user.id;
        const userRole = session.user.role;

        // Check if user role is valid for approval
        const approvalLevel = mapRoleToApprovalLevel(userRole);
        if (!approvalLevel) {
          return reply.status(403).send({
            success: false,
            message: `User role '${userRole}' is not allowed to submit approval. Must be: evaluator, verifikator, or manager`,
          });
        }

        // Validate input
        if (!folderId) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.folder.folderIdRequired'),
          });
        }

        if (!contractId) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.folder.contractIdRequired'),
          });
        }

        if (!status || (status !== 'approved' && status !== 'rejected')) {
          return reply.status(400).send({
            success: false,
            message: 'Invalid status. Must be: approved or rejected',
          });
        }

        // Submit approval
        const approvalLogEntry = await submitApproval(
          folderId,
          contractId,
          userId,
          userRole,
          status,
          note
        );

        // Get approval summary after submission
        const summary = await getApprovalSummary(folderId);

        return reply.status(200).send({
          success: true,
          message: `Approval submitted successfully at level: ${approvalLevel}`,
          data: {
            approvalId: approvalLogEntry.id,
            folderId: approvalLogEntry.folderId,
            approvalLevel: approvalLogEntry.approvalLevel,
            status: approvalLogEntry.status,
            approvedAt: approvalLogEntry.createdAt.toISOString(),
            currentSummary: {
              currentApprovalLevel: summary.currentApprovalLevel,
              nextRequiredLevel: summary.nextRequiredLevel,
              isFullyApproved: summary.isFullyApproved,
            }
          }
        });
      } catch (error: any) {
        // Check for specific error messages to determine HTTP status
        if (
          error.message.includes('not found') ||
          error.message.includes('Folder with ID')
        ) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.csms.contract.folder.folderNotFound'),
          });
        }

        if (error.message.includes('Only depth 0 folders')) {
          return reply.status(400).send({
            success: false,
            message: 'Only depth 0 folders can be approved',
          });
        }

        if (error.message.includes('already been submitted')) {
          return reply.status(400).send({
            success: false,
            message: `Approval at this level has already been submitted for this folder: ${error.message}`,
          });
        }

        if (error.message.includes('Cannot submit approval')) {
          return reply.status(400).send({
            success: false,
            message: error.message,
          });
        }

        return reply.status(500).send({
          success: false,
          message: error.message || 'Failed to submit approval',
        });
      }
    })
  });
};

export default submitApprovalRoutes;
