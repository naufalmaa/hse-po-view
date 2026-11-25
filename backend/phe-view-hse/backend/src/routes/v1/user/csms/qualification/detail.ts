import { Type } from '@sinclair/typebox'
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { getQualificationAssessmentDetail } from '../../../../../services/csms/qualification/detail.service.ts'
import { withErrorHandler } from '../../../../../utils/withErrorHandler.ts';

const detailQualificationAssessmentRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'GET',
    url: '/:id',
    schema: {
      tags: ['Qualification'],
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

      const { id } = req.params as { id: string };

      const result = await getQualificationAssessmentDetail(id)

      if (!result) {
        return reply.status(404).send({ 
          success: false,
          message: req.i18n.t('user.csms.qualification.qualificationNotFound') 
        })
      }

      return reply.send({
        success: true,
        message: req.i18n.t('user.csms.qualification.qualificationRetrieved'),
        data: result
      })
    }),
  })
}

export default detailQualificationAssessmentRoute