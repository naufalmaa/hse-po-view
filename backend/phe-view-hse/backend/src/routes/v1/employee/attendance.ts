import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { withErrorHandler } from '../../../utils/withErrorHandler.ts';
import { listAttendanceService } from '../../../services/attendance/list.service.ts';
import type { ListAttendanceParams } from '../../../types/employee.ts';
import { Type } from '@sinclair/typebox';
import { eq } from 'drizzle-orm';
import { db } from '../../../db/index.ts';
import { employees } from '../../../db/schema/employee.schema.ts';
import { subtypes, workLocations } from '../../../db/schema/report.schema.ts';
import { convertArrayTimestampsToWIB } from '../../../utils/timezone.ts';

const SuccessResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Any(),
  meta: Type.Optional(Type.Any())
});

const ErrorResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String()
});

// Request body schema for listing attendance
const ListAttendanceBody = Type.Object({
  employeeId: Type.Optional(Type.String()),
  date_start: Type.Optional(Type.String()),
  date_end: Type.Optional(Type.String()),
  limit: Type.Optional(Type.Number()),
  page: Type.Optional(Type.Number()),
  status: Type.Optional(Type.Array(Type.Union([
    Type.Literal('on_duty'),
    Type.Literal('off_duty')
  ]))),
});

const listAttendanceRoute: FastifyPluginAsyncTypebox = async (app) => {
  // List attendance
  app.route({
    url: '/attendance/list',
    method: 'POST',
    schema: {
      tags: ['Attendance'],
      summary: 'List Attendance (Public API)',
      description: 'Endpoint to list attendance records for employees',
      body: ListAttendanceBody,
      response: {
        200: SuccessResponse,
        500: ErrorResponse
      }
    },
    handler: withErrorHandler(async (req, reply) => {
      const employee = req.session.user;

      if (!employee) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized'
        });
      }

      try {
        // Get employee ID by matching HSSE passport number from session with database
        const [dbEmployee] = await db
          .select({
            id: employees.id,
            employeeName: employees.employeeName,
            projectId: employees.projectId,
            location: employees.location,
          })
          .from(employees)
          .where(eq(employees.hssePassportNumber, employee.hssePassportNumber));
        
        if (!dbEmployee) {
          return reply.status(400).send({
            success: false,
            message: req.i18n.t('user.employee.employeeRecordNotFound')
          });
        }

        let projectName: string | null = null;
        if (dbEmployee.projectId) {
          const [proj] = await db
            .select({ name: subtypes.name })
            .from(subtypes)
            .where(eq(subtypes.id, dbEmployee.projectId));
          projectName = proj?.name ?? null;
        }

        const filters = req.body as Partial<ListAttendanceParams>;

        // Override employeeId with logged-in employee's ID
        const data = await listAttendanceService({
          ...filters,
          employeeId: dbEmployee.id,
        });

        // Convert timestamps to WIB timezone
        const convertedData = convertArrayTimestampsToWIB(data.data);

        return reply.status(200).send({ 
          success: true,
          message: 'Attendance listed successfully',
          data: convertedData,
          meta: {
            ...data.meta,
            employee: {
              id: dbEmployee.id,
              employeeName: dbEmployee.employeeName,
              projectId: dbEmployee.projectId,
              projectName,
              location: dbEmployee.location,
            },
          },
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: 'Failed to list attendance'
        });
      }
    }),
  });

  // Get current logged-in employee profile (with project and work locations)
  app.route({
    url: '/attendance/profile',
    method: 'GET',
    schema: {
      tags: ['Attendance'],
      summary: 'Get Logged-in Employee Profile',
      description: 'Endpoint to get employee profile for the current session, including projectId and workLocations',
      response: {
        200: SuccessResponse,
        500: ErrorResponse,
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      const sessionUser = req.session.user;
      if (!sessionUser) {
        return reply.status(401).send({ success: false, message: 'Unauthorized' });
      }

      const [dbEmployee] = await db
        .select({
          id: employees.id,
          employeeName: employees.employeeName,
          category: employees.category,
          projectId: employees.projectId,
          location: employees.location,
          position: employees.position,
          hssePassportNumber: employees.hssePassportNumber,
        })
        .from(employees)
        .where(eq(employees.hssePassportNumber, sessionUser.hssePassportNumber));

      if (!dbEmployee) {
        return reply.status(404).send({ success: false, message: 'Employee not found' });
      }

      let projectName: string | null = null;
      let projectWorkLocations: any[] = [];

      if (dbEmployee.projectId) {
        const [project] = await db
          .select({ name: subtypes.name })
          .from(subtypes)
          .where(eq(subtypes.id, dbEmployee.projectId));
        projectName = project?.name ?? null;

        projectWorkLocations = await db
          .select({
            id: workLocations.id,
            name: workLocations.name,
            latitude: workLocations.latitude,
            longitude: workLocations.longitude,
          })
          .from(workLocations)
          .where(eq(workLocations.projectId, dbEmployee.projectId));
      }

      return reply.status(200).send({
        success: true,
        message: 'Profile retrieved successfully',
        data: {
          ...dbEmployee,
          projectName,
          workLocations: projectWorkLocations,
        },
      });
    }),
  });
};

export default listAttendanceRoute;
