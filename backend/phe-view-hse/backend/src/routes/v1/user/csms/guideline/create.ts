import { Type } from '@sinclair/typebox'
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { withErrorHandler } from '../../../../../utils/withErrorHandler.ts';
import { createGuidelineWithFiles } from '../../../../../services/csms/guidline/create.service.ts'

const createGuidelineWithFilesRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/create',
    method: 'POST',
    schema: {
      tags: ['Guideline'],
      summary: 'Create',
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

      // Multipart parsing
      const rawFields: Record<string, string> = {}
      const fileList: { buffer: Buffer; mimetype: string; originalname: string }[] = []
      const notes: string[] = []

      if (typeof req.parts === 'function') {
        for await (const part of req.parts()) {
          if (part.type === 'file' && part.fieldname === 'file') {
            const buffer = await part.toBuffer()
            fileList.push({
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

      // Field validation (safe casting)
      const { title, description } = rawFields

      if (!title || !description) {
        return reply.status(400).send({ 
          success: false,
          message: req.i18n.t('user.csms.guideline.guidelineCreateFailed')
        })
      }

      // Create service
      const result = await createGuidelineWithFiles({
        title,
        description,
        files: fileList,
        notes,
      })

      return reply.send({
        success: true,
        message: req.i18n.t('user.csms.guideline.guidelineCreated'),
        data: result
      })
    }),
  })
}

export default createGuidelineWithFilesRoute