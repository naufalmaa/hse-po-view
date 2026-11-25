import { Type } from '@sinclair/typebox'
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { withErrorHandler } from '../../../../../utils/withErrorHandler.ts';
import { createRiskAssessment } from '../../../../../services/csms/risk/create.service.ts'

const createRiskRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'POST',
    url: '/create',
    schema: {
      tags: ['Risk'],
      summary: 'Create Risk (Contractor Only)',
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
        403: Type.Object({
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

      if (user.role !== 'contractor') {
        return reply.status(403).send({ 
          success: false,
          message: req.i18n.t('user.csms.risk.insufficientPermission') 
        })
      }

      const contractorId = user.id

      // 2. Parse multipart fields
      const rawFields: Record<string, string> = {}
      const files: { buffer: Buffer; mimetype: string; originalname: string }[] = []
      const notes: string[] = []

      if (typeof req.parts === 'function') {
        for await (const part of req.parts()) {
          if (part.type === 'file' && part.fieldname === 'file') {
            const buffer = await part.toBuffer()
            files.push({
              buffer,
              mimetype: part.mimetype,
              originalname: part.filename,
            })
          } else if (part.type === 'field') {
            if (typeof part.value === 'string') {
              rawFields[part.fieldname] = part.value
              if (part.fieldname === 'note') {
                notes.push(part.value)
              }
            }
          }
        }
      }

      const { title, description } = rawFields

      if (!title || !description) {
        return reply.status(400).send({ 
          success: false,
          message: req.i18n.t('user.csms.risk.riskCreateFailed')
        })
      }

      const result = await createRiskAssessment({
        contractorId,
        title,
        description,
        files,
        notes,
      })

      return reply.send({
        success: true,
        message: req.i18n.t('user.csms.risk.riskCreated'),
        data: result
      })
    }),
  })
}

export default createRiskRoute