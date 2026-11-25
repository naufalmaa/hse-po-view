import { Type } from '@sinclair/typebox'
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { withErrorHandler } from '../../../../../utils/withErrorHandler.ts';
import { updateQualificationAssessment } from '../../../../../services/csms/qualification/update.service.ts'
import { getQualificationAssessmentDetail } from '../../../../../services/csms/qualification/detail.service.ts'
import { uploadQualificationFilesService } from '../../../../../services/csms/qualification/upload.service.ts'

const updateQualificationRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'PATCH',
    url: '/update',
    schema: {
      tags: ['Qualification'],
      summary: 'Update Qualification (Admin/User/Contractor)',
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
      const user = req.session.user;
      
      // Check if user has permission to update qualifications
      if (!user || (user.role !== 'admin' && user.role !== 'user' && user.role !== 'contractor')) {
        return reply.status(403).send({ 
          success: false,
          message: req.i18n.t('user.csms.qualification.insufficientPermission') 
        })
      }

      const rawFields: Record<string, string> = {}
      const files: { buffer: Buffer; mimetype: string; filename: string }[] = []
      const newFileNotes: string[] = []
      let updatedFileNotes: { id: string; note: string }[] = []

      if (typeof req.parts === 'function') {
        for await (const part of req.parts()) {
          if (part.type === 'file' && part.fieldname === 'file') {
            const buffer = await part.toBuffer()
            files.push({
              buffer,
              mimetype: part.mimetype,
              filename: part.filename,
            })
          } else if (part.type === 'field' && typeof part.value === 'string') {
            if (part.fieldname === 'updatedNotes') {
              try {
                updatedFileNotes = JSON.parse(part.value)
              } catch (err) {
                return reply.status(400).send({ 
                  success: false,
                  message: req.i18n.t('user.csms.qualification.qualificationUpdateFailed') + ': Invalid JSON format for updatedNotes' 
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

      const { qualificationAssessmentId, title, numberCertificate, assessmentDate, expiredDate, qualifiedValue, assessmentResult } = rawFields

      if (!qualificationAssessmentId) {
        return reply.status(400).send({ 
          success: false,
          message: req.i18n.t('user.csms.qualification.qualificationUpdateFailed') + ': Missing required fields' 
        })
      }

      try {
        // Handle file uploads separately using the dedicated upload service
        if (files.length > 0) {
          await uploadQualificationFilesService({
            qualificationAssessmentId,
            files: files.map(file => ({
              buffer: file.buffer,
              mimetype: file.mimetype,
              filename: file.filename,
            })),
            notes: newFileNotes
          })
        }

        // Update qualification assessment fields
        await updateQualificationAssessment({
          qualificationAssessmentId,
          title,
          numberCertificate,
          assessmentDate,
          expiredDate,
          qualifiedValue,
          assessmentResult,
          files: [],
          newFileNotes: [],
          updatedFileNotes
        })

        // Fetch updated detail to ensure response includes newly uploaded files
        const updatedDetail = await getQualificationAssessmentDetail(qualificationAssessmentId)
        
        return reply.status(200).send({
          success: true,
          message: req.i18n.t('user.csms.qualification.qualificationUpdated'),
          data: updatedDetail || {}
        })
      }
      catch (error: any) {
        return reply.status(400).send({ 
          success: false,
          message: req.i18n.t('user.csms.qualification.qualificationUpdateFailed') + ': ' + error.message 
        })
      }
    })
  })
}

export default updateQualificationRoute