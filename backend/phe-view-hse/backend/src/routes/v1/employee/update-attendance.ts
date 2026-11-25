import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { withErrorHandler } from '../../../utils/withErrorHandler.ts';
import { updateAttendanceService } from '../../../services/attendance/update.service.ts';
import { Type } from '@sinclair/typebox';
import { handleMultipartUpload } from '../../../services/employee/handleUpload.service.ts';
import { castFieldsWithSchema } from '../../../utils/cast.ts';
import { UpdateAttendanceSchema } from '../../../schema/employee.schema.ts';
import { eq } from 'drizzle-orm';
import { db } from '../../../db/index.ts';
import { employees } from '../../../db/schema/employee.schema.ts';

const UpdateAttendanceResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Optional(Type.Object({
    id: Type.String(),
    employeeId: Type.String(),
    attendanceDate: Type.String(),
    statusAfter: Type.String(),
    photoEvidence: Type.Optional(Type.String()),
    notes: Type.Optional(Type.String()),
    createdAt: Type.String(),
  })),
});

const updateAttendanceRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/attendance/update',
    method: 'POST',
    schema: {
      tags: ['Attendance'],
      summary: 'Update Attendance Status',
      description: 'Endpoint to update employee attendance status (check-in/check-out). Use multipart/form-data for file upload.',
      response: {
        200: UpdateAttendanceResponse,
        400: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        }),
        401: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        }),
        404: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        }),
        500: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        })
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

      // Use the same multipart handling approach as create employee
      let rawFields: Record<string, any> = {};
      let filesMap: Record<string, any[]> = {};

      if (typeof req.parts === 'function') {
        const result = await handleMultipartUpload(req.parts());
        rawFields = result.rawFields;
        filesMap = result.filesMap;
      }

      // Validate and cast fields using schema (like create.ts)
      const casted = castFieldsWithSchema(rawFields, UpdateAttendanceSchema);

      // Extract photo evidence from filesMap
      const photoFile = filesMap.photoEvidence?.[0];
      let photoEvidence: { buffer: Buffer; filename: string; mimetype: string } | undefined;

      if (photoFile) {
        photoEvidence = {
          buffer: photoFile.buffer,
          filename: photoFile.filename,
          mimetype: photoFile.mimetype,
        };
      }

      // Validate required fields using casted data
      if (!casted.status) {
        return reply.status(400).send({
          success: false,
          message: req.i18n.t('user.employee.statusRequired')
        });
      }

      // Extract position data from casted fields
      let positionData: any = undefined;
      if (casted.position) {
        positionData = casted.position;
      }

      // Get employee ID by matching HSSE passport number from session with database
      const [dbEmployee] = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.hssePassportNumber, employee.hssePassportNumber));
      
      if (!dbEmployee) {
        return reply.status(400).send({
          success: false,
          message: req.i18n.t('user.employee.employeeRecordNotFound')
        });
      }
      
      const employeeId = dbEmployee.id;
      
      const result = await updateAttendanceService({
        employeeId: employeeId,
        status: casted.status,
        photoEvidence,
        notes: casted.notes,
        position: positionData,
        workLocationId: casted.workLocationId,
      });

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          message: result.message || req.i18n.t('user.employee.attendanceUpdateFailed')
        });
      }

      return reply.status(200).send({
        success: true,
        message: req.i18n.t('user.employee.attendanceUpdated'),
        data: result.data
      });
    }),
  });
};

export default updateAttendanceRoute;