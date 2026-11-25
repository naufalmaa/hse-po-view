import { Type, type Static } from '@sinclair/typebox';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { fromNodeHeaders } from 'better-auth/node';
import { getAuthInstance } from '../../../../decorators/auth.decorator.ts';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';

const ListSessionBodySchema = Type.Object({
  userId: Type.String({
    examples: ['a37d21da-fd10-48bc-8281-9e95d2cccdd2'],
  }),
});

type ListSessionBodyType = Static<typeof ListSessionBodySchema>;

const listSessionRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/list',
    method: 'POST',
    schema: {
      tags: ['Admin'],
      summary: 'List all sessions',
      description: 'List all sessions for a specific user',
      body: ListSessionBodySchema,
      response: {
        200: Type.Object({
          success: Type.Boolean({ default: true }),
          message: Type.String(),
          sessions: Type.Array(Type.Any()),
        }),
        '4xx': Type.Object({
          success: Type.Boolean({ default: false }),
          message: Type.String(),
        }),
      },
    },

    handler: withErrorHandler(async (req, reply) => {
      const auth = getAuthInstance(app);
      const body = req.body as ListSessionBodyType;

      try {
        const sessions = await auth.api.listUserSessions({
          body: { userId: body.userId },
          headers: fromNodeHeaders(req.headers),
        });

        return reply.status(200).send({
          message: req.i18n.t('admin.session.sessionListSuccess'),
          sessions: sessions?.sessions ?? [],
        });
      } catch (err: any) {
        return reply.badRequest(req.i18n.t('admin.session.sessionListFailed'));
      }
    }),
  });
};

export default listSessionRoute;
