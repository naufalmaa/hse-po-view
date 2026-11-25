import { Type } from '@sinclair/typebox'
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { getQualificationAssessmentList } from '../../../../../services/csms/qualification/list.service.ts'
import { withErrorHandler } from '../../../../../utils/withErrorHandler.ts';

const listQualificationAssessmentRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'GET',
    url: '/list',
    schema: {
      tags: ['Qualification'],
      summary: 'List all qualification assessments (contractor sees only their own)',
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

      if (!user.id || !user.role) {
        return reply.status(401).send({ 
          success: false,
          message: req.i18n.t('auth.unauthorized') 
        })
      }

      // 2. Fetch data sesuai role
      const result = await getQualificationAssessmentList({
        id: user.id,
        role: user.role,
      })

      return reply.send({
        success: true,
        message: req.i18n.t('user.csms.qualification.qualificationsListed'),
        data: result
      })
    }),
  })
}

export default listQualificationAssessmentRoute