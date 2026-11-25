import { Type } from '@sinclair/typebox'
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { getRiskAssessmentDetail } from '../../../../../services/csms/risk/detail.service.ts'
import { withErrorHandler } from '../../../../../utils/withErrorHandler.ts'

const detailRiskAssessmentRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.get('/:id', {
    schema: {
      tags: ['Risk'],
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
        401: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
        404: Type.Object({
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
      const { id } = req.params as { id: string }

      const result = await getRiskAssessmentDetail(id)

      if (!result) {
        return reply.status(404).send({ 
          success: false,
          message: req.i18n.t('user.csms.risk.riskNotFound') 
        })
      }

      return reply.send({
        success: true,
        message: req.i18n.t('user.csms.risk.riskRetrieved'),
        data: result
      })
    }),
  })
}

export default detailRiskAssessmentRoute