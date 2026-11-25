import { Type } from '@sinclair/typebox'
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import {deleteRiskAssessment, deleteRiskFileByIds} from '../../../../../services/csms/risk/delete.service.ts'
import { withErrorHandler } from '../../../../../utils/withErrorHandler.ts';

const deleteRiskRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.delete('/:id', {
    schema: {
      tags: ['Risk'],
      summary: 'Delete',
      params: Type.Object({
        id: Type.String({ format: 'uuid' }),
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          riskAssessmentId: Type.String(),
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
      // 1. Auth check
      const user = req.session.user;
      if (!user) {
        return reply.status(401).send({ 
          success: false,
          message: req.i18n.t('auth.unauthorized') 
        })
      }

      const { id } = req.params as { id: string }
      
      try {
        const result = await deleteRiskAssessment(id)
        return reply.send({
          ...result,
          success: true,
          message: req.i18n.t('user.csms.risk.riskDeleted')
        })
      } catch (error: any) {
        if (error.message && error.message.includes('not found')) {
          return reply.status(404).send({
            success: false,
            message: req.i18n.t('user.csms.risk.riskNotFound') || 'Risk Assessment not found'
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
        tags: ['Risk'],
        summary: 'Multiple Delete file by IDs',
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
          message: req.i18n.t('user.csms.risk.riskDeleteFailed')
        });
      }

      try {
        const result = await deleteRiskFileByIds(ids);

        return reply.send({
          ...result,
          success: true,
          message: req.i18n.t('user.csms.risk.filesDeleted')
        });
      } catch (error) {
        return reply.status(500).send({ 
          success: false,
          message: req.i18n.t('user.csms.risk.riskDeleteFailed')
        });
      }
    })
  });
}

export default deleteRiskRoute