import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { db } from '../../../../db/index.ts';
import { employees } from '../../../../db/schema/employee.schema.ts';
import { workLocations } from '../../../../db/schema/report.schema.ts';
import { locations } from '../../../../db/schema/auth.schema.ts';
import { isNotNull } from 'drizzle-orm';
import { Type } from '@sinclair/typebox';

const SuccessResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Array(Type.String()),
});

const ErrorResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
});

// Regex to detect GPS coordinates like "-6.1141651, 106.8615358"
const COORD_REGEX = /^[-+]?\d+(\.\d+)?,\s*[-+]?\d+(\.\d+)?$/;

function isValidLocationName(name: string | null | undefined): boolean {
  if (!name) return false;
  const trimmed = name.trim();
  if (trimmed.length < 2) return false;
  if (trimmed === '-' || trimmed === '.' || trimmed === 'N/A' || trimmed.toLowerCase() === 'test') return false;
  if (COORD_REGEX.test(trimmed)) return false;
  return true;
}

const employeeLocationsRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/locations',
    method: 'GET',
    schema: {
      tags: ['Employee'],
      summary: 'Get Distinct Employee Locations and Work Locations',
      response: {
        200: SuccessResponse,
        500: ErrorResponse,
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      try {
        // Query distinct locations from employees
        const empLocs = await db
          .selectDistinct({ location: employees.location })
          .from(employees)
          .where(isNotNull(employees.location));

        // Query distinct work location names
        const workLocs = await db
          .selectDistinct({ name: workLocations.name })
          .from(workLocations)
          .where(isNotNull(workLocations.name));

        // Query distinct locations from master locations table
        const masterLocs = await db
          .selectDistinct({ name: locations.name })
          .from(locations)
          .where(isNotNull(locations.name));

        const set = new Set<string>();
        for (const r of empLocs) {
          if (isValidLocationName(r.location)) {
            set.add(r.location!.trim());
          }
        }
        for (const r of workLocs) {
          if (isValidLocationName(r.name)) {
            set.add(r.name!.trim());
          }
        }
        for (const r of masterLocs) {
          if (isValidLocationName(r.name)) {
            set.add(r.name!.trim());
          }
        }

        const sortedLocations = Array.from(set).sort((a, b) => a.localeCompare(b));

        return reply.status(200).send({
          success: true,
          message: 'Locations fetched successfully',
          data: sortedLocations,
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: error?.message || 'Failed to fetch locations',
        });
      }
    }),
  });
};

export default employeeLocationsRoute;
