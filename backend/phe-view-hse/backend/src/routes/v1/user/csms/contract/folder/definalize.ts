import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { Type } from '@sinclair/typebox';
import { withErrorHandler } from "../../../../../../utils/withErrorHandler.ts";
import { definalizeFolder, DefinalizeFolderError } from "../../../../../../services/csms/contract/definalize-folder.service.ts";

const bodySchema = Type.Object({
  folderId: Type.String({ format: 'uuid' }),
  reason: Type.String({ maxLength: 2000 }),
});

const errorSchema = Type.Object({ success: Type.Boolean(), message: Type.String() });

const definalizeFolderRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/definalize-folder',
    method: 'POST',
    schema: {
      tags: ['CSMS Contract'],
      summary: 'Re-open a finalized assessment folder (admin only)',
      description: 'Sets isFinal=false on a depth 0 assessment folder so the contractor can upload again. Files and scores are kept; the approval chain continues where it was.',
      body: bodySchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({ id: Type.String({ format: 'uuid' }), name: Type.String(), isFinal: Type.Boolean() }),
        }),
        400: errorSchema,
        403: errorSchema,
        500: errorSchema,
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      const { folderId, reason } = req.body as { folderId: string; reason: string };
      const session = (req as any).session;
      if (!session?.user) {
        return reply.status(403).send({ success: false, message: req.i18n.t('auth.unauthorized') });
      }

      try {
        const result = await definalizeFolder({ folderId, reason, adminUserId: session.user.id, role: session.user.role });
        return reply.status(200).send({
          success: true,
          message: 'Finalisasi berhasil dibuka. Kontraktor dapat mengunggah berkas kembali.',
          data: { id: result.id, name: result.name, isFinal: result.isFinal },
        });
      } catch (error: any) {
        if (error instanceof DefinalizeFolderError) {
          return reply.status(error.code === 'forbidden' ? 403 : 400).send({ success: false, message: error.message });
        }
        return reply.status(500).send({ success: false, message: error?.message || 'Gagal membuka finalisasi' });
      }
    }),
  });
};

export default definalizeFolderRoutes;
