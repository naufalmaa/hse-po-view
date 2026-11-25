import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type, type Static } from '@sinclair/typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { resolvePOBSuggestionService } from '../../../../services/employee/resolve-pob-suggestion.service.ts';

const ResolveParams = Type.Object({
  logId: Type.String({ format: 'uuid' }),
  passportNumber: Type.String(),
  employeeId: Type.String({ format: 'uuid' })
});

type ResolveParamsType = Static<typeof ResolveParams>;

const SuccessResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String()
});

const resolvePOBSuggestionRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'POST',
    url: '/resolve-pob-suggestion',
    schema: {
      summary: 'Resolve unmatched POB employee using suggestion',
      tags: ['Employee'],
      body: ResolveParams,
      response: {
        200: SuccessResponse,
        400: SuccessResponse,
        500: SuccessResponse
      }
    },
    handler: withErrorHandler(async (req, reply) => {
      try {
        await resolvePOBSuggestionService(req.body as ResolveParamsType);
        return reply.send({
          success: true,
          message: req.i18n.t('user.employee.pobSuggestionResolved')
        });
      } catch (error: any) {
        return reply.code(400).send({
          success: false,
          message: req.i18n.t('user.employee.pobSuggestionResolveFailed')
        });
      }
    })
  });
};

export default resolvePOBSuggestionRoute;
