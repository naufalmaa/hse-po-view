import { Type } from '@sinclair/typebox'
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { withErrorHandler } from '../../../../../utils/withErrorHandler.ts'
import { updateRiskAssessment } from '../../../../../services/csms/risk/update.service.ts'

const updateRiskRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'PATCH',
    url: '/update',
    schema: {
      tags: ['Risk'],
      summary: 'Update Risk (Role-based Access)',
      consumes: ['multipart/form-data'],
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Any()
        }),
        400: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
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
      if (!user?.role) {
        return reply.status(401).send({ 
          success: false,
          message: req.i18n.t('auth.unauthorized') 
        })
      }

      const role = user.role as 'admin' | 'user' | 'contractor'

      const rawFields: Record<string, string> = {}
      const files: { buffer: Buffer; mimetype: string; originalname: string }[] = []
      const newFileNotes: string[] = []
      let updatedFileNotes: { id: string; note: string }[] = []

      if (typeof req.parts === 'function') {
        for await (const part of req.parts()) {
          if (part.type === 'file' && part.fieldname === 'file') {
            const buffer = await part.toBuffer()
            files.push({
              buffer,
              mimetype: part.mimetype,
              originalname: part.filename,
            })
          } else if (part.type === 'field' && typeof part.value === 'string') {
            if (part.fieldname === 'updatedNotes') {
              try {
                updatedFileNotes = JSON.parse(part.value)
              } catch (err) {
                return reply.status(400).send({ 
                  success: false,
                  message: req.i18n.t('user.csms.risk.riskUpdateFailed')
                })
              }
            } else if (part.fieldname === 'newFileNote') {
              newFileNotes.push(part.value)
            } else {
              rawFields[part.fieldname] = part.value
            }
          }
        }
      }

      const { riskAssessmentId, title, description, status, note } = rawFields

      if (!riskAssessmentId) {
        return reply.status(400).send({ 
          success: false,
          message: req.i18n.t('user.csms.risk.riskUpdateFailed')
        })
      }

      const result = await updateRiskAssessment({
        riskAssessmentId,
        title,
        description,
        status,
        note,
        files,
        newFileNotes,
        updatedFileNotes,
        role
      })

      return reply.send({
        success: true,
        message: req.i18n.t('user.csms.risk.riskUpdated'),
        data: result
      })
    }),
  })
}

export default updateRiskRoute