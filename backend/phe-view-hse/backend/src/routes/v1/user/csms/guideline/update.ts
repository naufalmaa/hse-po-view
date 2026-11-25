import { Type } from '@sinclair/typebox'
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { updateGuideline } from '../../../../../services/csms/guidline/update.service.ts'
import { withErrorHandler } from '../../../../../utils/withErrorHandler.ts';

const updateGuidelineRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'PUT',
    url: '/:id',
    schema: {
      tags: ['Guideline'],
      summary: 'Update',
      consumes: ['multipart/form-data'],
      params: Type.Object({
        id: Type.String({ format: 'uuid' }),
      }),
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
      if (!user) {
        return reply.status(401).send({ 
          success: false,
          message: req.i18n.t('auth.unauthorized') 
        })
      }

      // 2. Multipart parsing
      const rawFields: Record<string, string> = {}
      const newFiles: { buffer: Buffer; mimetype: string; originalname: string }[] = []
      const newNotes: string[] = []

      if (typeof req.parts === 'function') {
        for await (const part of req.parts()) {
          if (part.type === 'file' && part.fieldname === 'file') {
            const buffer = await part.toBuffer()
            newFiles.push({
              buffer,
              mimetype: part.mimetype,
              originalname: part.filename,
            })
          } else if (part.type === 'field') {
            const value = part.value as string
            rawFields[part.fieldname] = value

            if (part.fieldname === 'note') {
              newNotes.push(value)
            }
          }
        }
      }

      // 3. Extract fields
      const {
        title,
        description,
        updatedNotes,
      } = rawFields

      // 4. Parse optional JSON arrays
      let parsedUpdatedNotes: { id: string; note: string }[] = []

      try {
        if (updatedNotes) parsedUpdatedNotes = JSON.parse(updatedNotes)
      } catch (err) {
        return reply.status(400).send({ 
          success: false,
          message: req.i18n.t('user.csms.guideline.guidelineUpdateFailed') 
        })
      }

      // 5. Call service
      const { id } = req.params as { id: string };
      const result = await updateGuideline(id, {
        title,
        description,
        newFiles,
        newNotes,
        updatedNotes: parsedUpdatedNotes,
      })

      return reply.send({
        success: true,
        message: req.i18n.t('user.csms.guideline.guidelineUpdated'),
        data: result
      })
    }),
  })
}

export default updateGuidelineRoute