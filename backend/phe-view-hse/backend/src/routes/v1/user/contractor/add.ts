import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { db } from '../../../../db/index.ts';
import { subContractors } from '../../../../db/schema/auth.schema.ts';
import { Type } from '@sinclair/typebox';

// Schema for creating a contractor
const addContractorSchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string' },
    category: { type: 'string' },
  },
};

const addContractor: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: "POST",
    url: "/add",
    schema: {
      tags: ["Contractors"],
      summary: "Create a new contractor",
      body: addContractorSchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Any(),
        }),
        403: Type.Object({
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
      
      // Check if user has permission to create contractors
      if (user.role !== 'admin') {
        return reply.status(403).send({ 
          success: false, 
          message: req.i18n.t('auth.unauthorized') 
        });
      }

      const { name, category } = req.body as { name: string, category: string };

      try {
        const result = await db.insert(subContractors).values({ name, category }).returning();
        return reply.status(200).send({ 
          success: true,
          message: req.i18n.t('user.contractor.contractorCreated'),
          data: result[0]
        });
      } catch (err) {
        return reply.status(500).send({ 
          success: false, 
          message: req.i18n.t('user.contractor.contractorCreateFailed') 
        });
      }
    }),
  });
};

export default addContractor;