import { Type } from '@sinclair/typebox'
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { withErrorHandler } from '../../../../../utils/withErrorHandler.ts';
import { createQualificationAssessment } from '../../../../../services/csms/qualification/create.service.ts'
import { uploadQualificationFilesService } from '../../../../../services/csms/qualification/upload.service.ts'
import { getQualificationAssessmentDetail } from '../../../../../services/csms/qualification/detail.service.ts'
import { getSubContractorsByUserId } from '../../../../../services/users/list.service.ts'

const createQualificationRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'POST',
    url: '/create',
    schema: {
      tags: ['Qualification'],
      summary: 'Create Qualification (Admin/User/Contractor)',
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
        403: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      // 1. Auth check
      const user = req.session.user;

      // Get subcontractor based on user role
      let contractorId: string;
      // Parse form fields and files first to determine contractorId
      const rawFields: Record<string, string> = {}
      const files: Array<{
        buffer: Buffer;
        mimetype: string;
        filename: string;
      }> = []
      const notes: string[] = []

      if (typeof req.parts === 'function') {
        for await (const part of req.parts()) {
          if (part.type === 'field') {
            if (typeof part.value === 'string') {
              rawFields[part.fieldname] = part.value
            }
          } else if (part.type === 'file' && part.fieldname === 'file') {
            const buffer = await part.toBuffer()
            files.push({
              buffer,
              mimetype: part.mimetype,
              filename: part.filename,
            })
          } else if (part.type === 'file' && part.fieldname === 'note') {
            const buffer = await part.toBuffer()
            notes.push(buffer.toString())
          }
        }
      }

      if (user.role === 'contractor') {
        // For contractors, get their associated subcontractor ID
        const result = await getSubContractorsByUserId(user.id);
        if (result.data.length === 0) {
          return reply.status(403).send({ 
            success: false,
            message: req.i18n.t('user.csms.qualification.insufficientPermission') 
          })
        }
        // Use the first subcontractor ID associated with this user
        contractorId = result.data[0].id;
      } else if (user.role === 'admin' || user.role === 'user') {
        // For admin and user roles, get the contractorId from the request body
        contractorId = rawFields['contractorId'];
        
        if (!contractorId) {
          return reply.status(400).send({ 
            success: false,
            message: req.i18n.t('user.csms.qualification.qualificationCreateFailed') + ': Missing contractorId for admin/user role' 
          })
        }
      } else {
        return reply.status(403).send({ 
          success: false,
          message: req.i18n.t('user.csms.qualification.insufficientPermission') 
        })
      }

      const { title, numberCertificate, assessmentDate, expiredDate, qualifiedValue, assessmentResult } = rawFields

      // Check required fields
      if (!title || !numberCertificate || !assessmentDate || !expiredDate || !qualifiedValue || !assessmentResult) {
        return reply.status(400).send({ 
          success: false,
          message: req.i18n.t('user.csms.qualification.qualificationCreateFailed') + ': Missing required fields' 
        })
      }

      // Create qualification assessment first
      const result = await createQualificationAssessment({
        contractorId,
        title,
        numberCertificate,
        assessmentDate,
        expiredDate,
        qualifiedValue,
        assessmentResult,
      })

      // Upload files if any
      if (files.length > 0 && result.detail && typeof result.detail === 'object' && 'id' in result.detail) {
        await uploadQualificationFilesService({
          qualificationAssessmentId: result.detail.id as string,
          files: files.map(file => ({
            buffer: file.buffer,
            mimetype: file.mimetype,
            filename: file.filename,
          })),
          notes
        })
          
        // Fetch updated detail with uploaded files
        const updatedDetail = await getQualificationAssessmentDetail(result.detail.id as string)
        if (updatedDetail) {
          result.detail = updatedDetail
        }
      }

      // Ensure we have a valid result object
      const responseData = {
        success: true,
        message: req.i18n.t('user.csms.qualification.qualificationCreated'),
        data: result.detail || {}
      };

      return reply.status(200).send(responseData)
    }),
  })
}

export default createQualificationRoute