import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { withErrorHandler } from "../../../../../../utils/withErrorHandler.ts";
import { Type } from '@sinclair/typebox';
import { bulkUpdateFolderAssessment } from "../../../../../../services/csms/contract/assessment.service.ts";

const assessmentItemSchema = Type.Object({
  folderId: Type.String({ format: 'uuid' }),
  status: Type.Enum({ pending: 'pending', accept: 'accept', reject: 'reject', revision: 'revision' }),
  score: Type.Integer({ minimum: -1, maximum: 10 }),
  note: Type.Optional(Type.String()),
});

const bodySchema = Type.Object({
  rootFolderId: Type.String({ format: 'uuid' }),
  items: Type.Array(assessmentItemSchema),
});

const bulkAssessmentRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/bulk-assessment',
    method: 'POST',
    schema: {
      tags: ['CSMS Contract Assessment'],
      summary: 'Bulk update folder assessments',
      description: 'Bulk update scores, statuses, and notes for scoreable folders under a root folder. Recalculates parent scores in one transaction.',
      body: bodySchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          count: Type.Number(),
        }),
      }
    },
    handler: withErrorHandler(async (req, reply) => {
      const { rootFolderId, items } = req.body as {
        rootFolderId: string;
        items: Array<{
          folderId: string;
          status: 'pending' | 'accept' | 'reject' | 'revision';
          score: number;
          note?: string;
        }>;
      };

      const session = (req as any).session;
      if (!session?.user) {
        return reply.status(403).send({
          success: false,
          message: req.i18n.t('auth.unauthorized'),
        });
      }

      if (!['admin', 'user'].includes(session.user.role)) {
        return reply.status(403).send({
          success: false,
          message: req.i18n.t('user.csms.contract.assessment.insufficientPermission'),
        });
      }

      if (!rootFolderId || !items || !Array.isArray(items)) {
        return reply.status(400).send({
          success: false,
          message: 'rootFolderId and items array are required',
        });
      }

      const result = await bulkUpdateFolderAssessment({
        rootFolderId,
        items,
        updatedBy: session.user.id,
      });

      return reply.status(200).send({
        success: true,
        message: 'Penilaian massal berhasil disimpan',
        count: result.count,
      });
    })
  });
};

export default bulkAssessmentRoutes;
