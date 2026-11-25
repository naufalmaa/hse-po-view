import { Type } from '@sinclair/typebox';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { db } from '../../../../db/index.ts';
import { workLocations } from '../../../../db/schema/report.schema.ts';
import { eq, asc } from 'drizzle-orm';

const WorkLocationSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  projectId: Type.String({ format: 'uuid' }),
  name: Type.String(),
  latitude: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  longitude: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  createdAt: Type.Optional(Type.Any()),
  updatedAt: Type.Optional(Type.Any()),
});

const workLocationsRoute: FastifyPluginAsyncTypebox = async (app) => {
  // GET /work-locations?projectId=...
  app.route({
    method: 'GET',
    url: '/work-locations',
    schema: {
      tags: ['Work Location'],
      summary: 'List work locations',
      querystring: Type.Object({
        projectId: Type.Optional(Type.String({ format: 'uuid' })),
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Array(WorkLocationSchema),
        }),
        500: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      const { projectId } = req.query as { projectId?: string };

      let query = db.select().from(workLocations);
      if (projectId) {
        query = query.where(eq(workLocations.projectId, projectId)) as any;
      }

      const rows = await query.orderBy(asc(workLocations.name));

      return reply.status(200).send({
        success: true,
        message: 'Work locations listed successfully',
        data: rows,
      });
    }),
  });

  // POST /work-locations
  app.route({
    method: 'POST',
    url: '/work-locations',
    schema: {
      tags: ['Work Location'],
      summary: 'Create work location',
      body: Type.Object({
        projectId: Type.String({ format: 'uuid' }),
        name: Type.String({ minLength: 1 }),
        latitude: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        longitude: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: WorkLocationSchema,
        }),
        500: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
        }),
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      const body = req.body as {
        projectId: string;
        name: string;
        latitude?: string | null;
        longitude?: string | null;
      };

      const [created] = await db
        .insert(workLocations)
        .values({
          projectId: body.projectId,
          name: body.name.trim(),
          latitude: body.latitude ?? null,
          longitude: body.longitude ?? null,
        })
        .returning();

      return reply.status(200).send({
        success: true,
        message: 'Work location created successfully',
        data: created,
      });
    }),
  });

  // PUT /work-locations/:id
  app.route({
    method: 'PUT',
    url: '/work-locations/:id',
    schema: {
      tags: ['Work Location'],
      summary: 'Update work location',
      params: Type.Object({
        id: Type.String({ format: 'uuid' }),
      }),
      body: Type.Object({
        name: Type.Optional(Type.String()),
        latitude: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        longitude: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: WorkLocationSchema,
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
      const { id } = req.params as { id: string };
      const body = req.body as {
        name?: string;
        latitude?: string | null;
        longitude?: string | null;
      };

      const updateData: any = { updatedAt: new Date() };
      if (body.name !== undefined) updateData.name = body.name.trim();
      if (body.latitude !== undefined) updateData.latitude = body.latitude;
      if (body.longitude !== undefined) updateData.longitude = body.longitude;

      const [updated] = await db
        .update(workLocations)
        .set(updateData)
        .where(eq(workLocations.id, id))
        .returning();

      if (!updated) {
        return reply.status(404).send({
          success: false,
          message: 'Work location not found',
        });
      }

      return reply.status(200).send({
        success: true,
        message: 'Work location updated successfully',
        data: updated,
      });
    }),
  });

  // DELETE /work-locations/:id
  app.route({
    method: 'DELETE',
    url: '/work-locations/:id',
    schema: {
      tags: ['Work Location'],
      summary: 'Delete work location',
      params: Type.Object({
        id: Type.String({ format: 'uuid' }),
      }),
      response: {
        200: Type.Object({
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
      const { id } = req.params as { id: string };

      await db.delete(workLocations).where(eq(workLocations.id, id));

      return reply.status(200).send({
        success: true,
        message: 'Work location deleted successfully',
      });
    }),
  });
};

export default workLocationsRoute;
