import { Type } from '@sinclair/typebox'
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { getGuidelineList } from '../../../../../services/csms/guidline/list.service.ts'
import { withErrorHandler } from '../../../../../utils/withErrorHandler.ts';

const listGuidelineRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.get('/list', {
    schema: {
      tags: ['Guideline'],
      summary: 'List',
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Array(Type.Any())
        }),
        401: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      // 1. Auth check
      const user = req.session.user;
      if (!user) {
        return reply.status(401).send({ 
          success: false,
          message: req.i18n.t('auth.unauthorized') 
        })
      }

      // 2. Fetch data
      const result = await getGuidelineList()
      return reply.send({
        success: true,
        message: req.i18n.t('user.csms.guideline.guidelinesListed'),
        data: result
      })
    }),
  })
}

export default listGuidelineRoute