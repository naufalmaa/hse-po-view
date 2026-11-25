import { Type } from '@sinclair/typebox'
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { getRiskAssessmentList } from '../../../../../services/csms/risk/list.service.ts'
import { withErrorHandler } from '../../../../../utils/withErrorHandler.ts'

const listRiskAssessmentRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.get('/list', {
    schema: {
      tags: ['Risk'],
      summary: 'List all risk assessments (contractor sees only their own)',
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

      if (!user.id || !user.role) {
        return reply.status(401).send({ 
          success: false,
          message: req.i18n.t('auth.unauthorized') 
        })
      }
      
      // 2. Fetch data sesuai role
      const data = await getRiskAssessmentList({
        id: user.id,
        role: user.role,
      })

      return reply.send({
        success: true,
        message: req.i18n.t('user.csms.risk.risksListed'),
        data: data
      })
    }),
  })
}

export default listRiskAssessmentRoute