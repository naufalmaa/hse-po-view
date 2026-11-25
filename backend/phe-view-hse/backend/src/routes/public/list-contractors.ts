import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { withErrorHandler } from "../../utils/withErrorHandler.ts";
import {
  getAllSubContractors,
} from "../../services/users/list.service.ts";

const ListContractorsPublic: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: "GET",
    url: "/contractors",
    schema: {
      tags: ["CSMS Public"],
      summary: "List all contractors (public endpoint)",
      description: "Public endpoint to retrieve all contractors without authentication",
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                  category: { type: ['string', 'null'] },
                  vessels: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        vesselName: { type: 'string' },
                        type: { type: ['string', 'null'] }
                      },
                      required: ['id', 'vesselName', 'type']
                    }
                  }
                },
                required: ['id', 'name', 'category']
              }
            }
          },
          required: ['success', 'data']
        }
      }
    },
    handler: withErrorHandler(async (_req, reply) => {
      try {
        const result = await getAllSubContractors();
        // Map the data to only include id and name for backward compatibility
        const mappedData = result.data.map((contractor: { id: string; name: string; category: string | null; vessels: { id: string; vesselName: string; type: string | null }[] }) => ({
          id: contractor.id,
          name: contractor.name,
          category: contractor.category
        }));
        return reply.send({ success: true, data: mappedData });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: error.message || 'Failed to retrieve contractors',
        });
      }
    }),
  });
};

export default ListContractorsPublic;