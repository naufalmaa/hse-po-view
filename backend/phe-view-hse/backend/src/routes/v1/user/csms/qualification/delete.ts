import { Type } from '@sinclair/typebox'
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import {deleteQualificationAssessment, deleteQualificationFileByIds} from '../../../../../services/csms/qualification/delete.service.ts'
import { withErrorHandler } from '../../../../../utils/withErrorHandler.ts';

const deleteGuidelineRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'DELETE',
    url: '/:id',
    schema: {
      tags: ['Qualification'],
      summary: 'Delete',
      params: Type.Object({
        id: Type.String({ format: 'uuid' }),
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          qualificationAssessmentId: Type.String(),
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
      const user = req.session.user;
      if (!user) {
        return reply.status(401).send({ 
          success: false,
          message: req.i18n.t('auth.unauthorized') 
        })
      }

      const { id } = req.params as { id: string };
      
      try {
        const result = await deleteQualificationAssessment(id)
        return reply.send({
          ...result,
          success: true,
          message: req.i18n.t('user.csms.qualification.qualificationDeleted')
        })
      } catch (error: any) {
        if (error.message && error.message.includes('not found')) {
          return reply.status(404).send({
            success: false,
            message: req.i18n.t('user.csms.qualification.qualificationNotFound') || 'Qualification Assessment not found'
          })
        }
        throw error
      }
    }),
  });

  app.route({
    method: 'DELETE',
    url: '/files',
    schema: {
      tags: ['Qualification'],
      summary: 'Delete multiple files by their IDs',
      body: Type.Object({
        ids: Type.Array(Type.String(), { minItems: 1 })
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          deletedFileIds: Type.Array(Type.String())
        }),
        400: Type.Object({ 
          success: Type.Boolean(),
          message: Type.String() 
        }),
        401: Type.Object({ 
          success: Type.Boolean(),
          message: Type.String() 
        }),
        500: Type.Object({ 
          success: Type.Boolean(),
          message: Type.String() 
        }),
      }
    },
    handler: withErrorHandler(async (req, reply) => {
      const user = req.session.user;
      
      if (!user) {
        return reply.status(401).send({ 
          success: false,
          message: req.i18n.t('auth.unauthorized')
        });
      }

      const { ids } = req.body as { ids: string[] };

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return reply.status(400).send({ 
          success: false,
          message: req.i18n.t('user.csms.qualification.qualificationDeleteFailed') + ': At least one file ID is required' 
        });
      }

      try {
        const result = await deleteQualificationFileByIds(ids);

        return reply.send({
          ...result,
          success: true,
          message: req.i18n.t('user.csms.qualification.filesDeleted')
        });
      } catch (error) {
        console.error('Failed to delete qualification files:', error);
        return reply.status(500).send({ 
          success: false,
          message: req.i18n.t('user.csms.qualification.qualificationDeleteFailed') + ': Internal server error' 
        });
      }
    })
  });
}

export default deleteGuidelineRoute