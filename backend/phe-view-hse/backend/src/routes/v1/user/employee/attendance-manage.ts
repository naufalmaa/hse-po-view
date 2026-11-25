import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { adminManageAttendanceService, type ManageAttendanceParams } from '../../../../services/attendance/admin-manage.service.ts';
import { Type } from '@sinclair/typebox';

const SuccessResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Optional(Type.Any()),
});

const ErrorResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
});

const attendanceManageRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/attendance-manage',
    method: 'POST',
    schema: {
      tags: ['Employee'],
      summary: 'Manage Employee Attendance Records (Admin/Contractor)',
      description: 'Create, update, or delete attendance records manually.',
      body: Type.Object({
        action: Type.Union([
          Type.Literal('create'),
          Type.Literal('update'),
          Type.Literal('delete'),
        ]),
        employeeId: Type.Optional(Type.String()),
        attendanceId: Type.Optional(Type.String()),
        statusAfter: Type.Optional(Type.Union([
          Type.Literal('on_duty'),
          Type.Literal('off_duty'),
        ])),
        attendanceDate: Type.Optional(Type.String()),
        createdAt: Type.Optional(Type.String()),
        notes: Type.Optional(Type.String()),
        position: Type.Optional(Type.Any()),
        workLocationId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      }),
      response: {
        200: SuccessResponse,
        400: ErrorResponse,
        403: ErrorResponse,
        500: ErrorResponse,
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      const user = req.session.user;
      const allowedRoles = ['admin', 'user', 'contractor'];

      if (!allowedRoles.includes(user.role)) {
        return reply.status(403).send({
          success: false,
          message: 'Unauthorized role',
        });
      }

      try {
        const result = await adminManageAttendanceService(req.body as ManageAttendanceParams);
        return reply.status(200).send({
          success: true,
          message: 'Attendance action executed successfully',
          data: result,
        });
      } catch (error: any) {
        console.error('[ATTENDANCE MANAGE ERROR]', error);
        const detail = error?.cause?.detail || error?.cause?.message;
        const message = detail ? `${error.message || 'Error'}: ${detail}` : (error.message || 'Failed to manage attendance');
        return reply.status(400).send({
          success: false,
          message,
        });
      }
    }),
  });
};

export default attendanceManageRoute;
