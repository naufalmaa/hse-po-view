import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { db } from '../../../../db/index.ts';
import { subContractors } from '../../../../db/schema/auth.schema.ts';
import { eq } from 'drizzle-orm';
import { Type } from '@sinclair/typebox';

// Schema for updating a contractor
const updateContractorSchema = {
  type: 'object',
  required: ['id', 'name'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
  },
};

const UpdateContractor: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: "PUT",
    url: "/update",
    schema: {
      tags: ["Contractors"],
      summary: "Update an existing contractor",
      body: updateContractorSchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Any()
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
    },
    handler: withErrorHandler(async (req, reply) => {
      const user = req.session.user;
      
      // Check if user has permission to update contractors
      if (user.role !== 'admin') {
        return reply.status(403).send({ 
          success: false, 
          message: req.i18n.t('auth.unauthorized') 
        });
      }

      const { id, name } = req.body as { id: string; name: string };

      try {
        // Check if contractor exists
        const existingContractor = await db.select().from(subContractors).where(eq(subContractors.id, id));
        if (existingContractor.length === 0) {
          return reply.status(404).send({ 
            success: false, 
            message: req.i18n.t('user.contractor.contractorNotFound') 
          });
        }

        const result = await db.update(subContractors).set({ name }).where(eq(subContractors.id, id)).returning();
        return reply.status(200).send({  
          success: true, 
          message: req.i18n.t('user.contractor.contractorUpdated'),
          data: result[0],
        });
      } catch (err) {
        return reply.status(500).send({ 
          success: false, 
          message: req.i18n.t('user.contractor.contractorUpdateFailed') 
        });
      }
    }),
  });
};

export default UpdateContractor;