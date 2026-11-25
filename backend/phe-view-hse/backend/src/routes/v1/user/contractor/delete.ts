import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { db } from '../../../../db/index.ts';
import { subContractors, userContractors } from '../../../../db/schema/auth.schema.ts';
import { eq } from 'drizzle-orm';
import { Type } from '@sinclair/typebox';

const DeleteContractor: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: "DELETE",
    url: "/delete",
    schema: {
      tags: ["Contractors"],
      summary: "Delete a contractor",
      body: Type.Object({
        id: Type.String(),
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
        400: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
        403: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
        404: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
        500: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
      },
      errorHandler: false,
    },
    handler: withErrorHandler(async (req, reply) => {
      try {
        const user = req.session?.user;
        
        // Check if user has permission to delete contractors
        if (!user || user.role !== 'admin') {
          return reply.status(403).send({ 
            success: false, 
            message: req.i18n.t('auth.unauthorized') 
          });
        }

        const { id } = req.body as { id: string };

        // Check if contractor exists
        const existingContractor = await db.select().from(subContractors).where(eq(subContractors.id, id));
        if (existingContractor.length === 0) {
          return reply.status(404).send({ 
            success: false, 
            message: req.i18n.t('user.contractor.contractorNotFound') 
          });
        }

        // Check if contractor is associated with any users
        const userAssociations = await db.select().from(userContractors).where(eq(userContractors.contractorId, id));
        if (userAssociations.length > 0) {
          return reply.status(400).send({ 
            success: false, 
            message: req.i18n.t('user.contractor.contractorInUse') 
          });
        }

        // Delete the contractor
        await db.delete(subContractors).where(eq(subContractors.id, id));

        return reply.status(200).send({ 
          success: true, 
          message: req.i18n.t('user.contractor.contractorDeleted') 
        });
      } catch (err) {
        req.log.error(err);
        return reply.status(500).send({ 
          success: false, 
          message: req.i18n.t('user.contractor.contractorDeleteFailed') 
        });
      }
    }),
  });
};

export default DeleteContractor;