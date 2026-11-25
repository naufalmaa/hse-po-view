import { Type } from '@sinclair/typebox'
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { getGuidelineDetail } from '../../../../../services/csms/guidline/detail.service.ts'
import { withErrorHandler } from '../../../../../utils/withErrorHandler.ts';

const detailGuidelineRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.get('/:id', {
    schema: {
      tags: ['Guideline'],
      summary: 'Details by id',
      params: Type.Object({
        id: Type.String({ format: 'uuid' }),
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Any()
        }),
        404: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
      },
    },
    handler: withErrorHandler(async (req, reply) => {
  
      const { id } = req.params as { id: string }

      const result = await getGuidelineDetail(id)

      if (!result) {
        return reply.status(404).send({ 
          success: false,
          message: req.i18n.t('user.csms.guideline.guidelineNotFound') 
        })
      }

      return reply.send({
        success: true,
        message: req.i18n.t('user.csms.guideline.guidelineRetrieved'),
        data: result
      })
    }),
  })
}

export default detailGuidelineRoute