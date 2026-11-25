import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { withErrorHandler } from "../../../../../../utils/withErrorHandler.ts";
import { Type } from '@sinclair/typebox';
import {
  previewAiApply,
  applyAiRecommendations,
  undoLastAiApply,
  lastAiApply,
} from "../../../../../../services/csms/contract/ai-apply.service.ts";

/**
 * "Terapkan rekomendasi AI": preview -> apply selected elements -> undo the last apply.
 * folderId = assessment folder (all categories), a category folder (e.g. "4 Manajemen Risiko") or one element.
 */
const errorSchema = Type.Object({ success: Type.Optional(Type.Boolean()), message: Type.String() });
const bodySchema = Type.Object({
  folderId: Type.String({ format: 'uuid' }),
  action: Type.Union([Type.Literal('preview'), Type.Literal('apply'), Type.Literal('undo')]),
  // apply: the elements to apply (from the preview); evaluators can still change every score manually afterwards
  elementIds: Type.Optional(Type.Array(Type.String({ format: 'uuid' }), { maxItems: 200 })),
});

const applyAiRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/apply-ai',
    method: 'POST',
    schema: {
      tags: ['CSMS Contract Assessment'],
      summary: 'Preview, apply or undo AI recommendations',
      description: 'preview: elements under folderId with current vs AI values; apply: elementIds in one transaction (never on a final assessment folder); undo: restore the last apply. Admin and User roles only.',
      body: bodySchema,
      response: {
        200: Type.Object({ success: Type.Boolean(), message: Type.String(), data: Type.Optional(Type.Any()) }),
        400: errorSchema,
        403: errorSchema,
        404: errorSchema,
        409: errorSchema,
        500: errorSchema,
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      const { folderId, action, elementIds } = req.body as { folderId: string; action: 'preview' | 'apply' | 'undo'; elementIds?: string[] };
      const session = (req as any).session;
      if (!session?.user) {
        return reply.status(403).send({ success: false, message: req.i18n.t('auth.unauthorized') });
      }
      if (!['admin', 'user'].includes(session.user.role)) {
        return reply.status(403).send({ success: false, message: req.i18n.t('user.csms.contract.assessment.insufficientPermission') });
      }
      try {
        if (action === 'preview') {
          const data = await previewAiApply(folderId);
          return reply.send({ success: true, message: 'ok', data: { ...data, lastApply: await lastAiApply(folderId) } });
        }
        if (action === 'undo') {
          const r = await undoLastAiApply(folderId);
          return reply.send({ success: true, message: `Penerapan terakhir dibatalkan (${r.restored} elemen dipulihkan)`, data: r });
        }
        const r = await applyAiRecommendations(folderId, elementIds ?? [], session.user.id);
        return reply.send({ success: true, message: `Rekomendasi AI diterapkan ke ${r.applied} elemen`, data: r });
      } catch (error: any) {
        const code = [400, 404, 409].includes(error?.statusCode) ? error.statusCode : 500;
        if (code === 500) console.error('Error applying AI recommendation:', error);
        return reply.status(code).send({ success: false, message: error?.message || 'Gagal menerapkan rekomendasi AI' });
      }
    }),
  });
};

export default applyAiRoutes;
