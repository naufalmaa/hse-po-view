import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { withErrorHandler } from '../../../../utils/withErrorHandler.ts';
import { listAttendanceService } from '../../../../services/attendance/list.service.ts';
import { listEmployeesService } from '../../../../services/employee/list.service.ts';
import type { ListAttendanceParams } from '../../../../types/employee.ts';
import { Type } from '@sinclair/typebox';
import { convertArrayTimestampsToWIB } from '../../../../utils/timezone.ts';
import { exportAttendanceExcelService } from '../../../../services/employee/export-attendance-excel.service.ts';

const SuccessResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Array(Type.Any()),
  meta: Type.Optional(Type.Any())
});

const ErrorResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String()
});

const attendanceListRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    url: '/attendance-list',
    method: 'POST',
    schema: {
      tags: ['Employee'],
      summary: 'List Employees with Attendance History',
      description: 'Get all employees with their attendance records',
      body: Type.Object({
        employeeId: Type.Optional(Type.Union([Type.String(), Type.Array(Type.String())])),
        limit: Type.Optional(Type.Number()),
        page: Type.Optional(Type.Number()),
        status: Type.Optional(Type.Array(Type.String())),
        category: Type.Optional(Type.Array(Type.String())),
        position: Type.Optional(Type.Array(Type.String())),
        location: Type.Optional(Type.Union([Type.String(), Type.Array(Type.String())])),
        subContractorId: Type.Optional(Type.Array(Type.String())),
        vesselId: Type.Optional(Type.Array(Type.String())),
        projectId: Type.Optional(Type.Array(Type.String())),
        search: Type.Optional(Type.String()),
        date_start: Type.Optional(Type.String()),
        date_end: Type.Optional(Type.String()),
        convertExcel: Type.Optional(Type.Boolean())
      }),
      response: {
        200: Type.Union([SuccessResponse, Type.Any()]),
        500: ErrorResponse
      }
    },
    handler: withErrorHandler(async (req, reply) => {
      try {
        const user = req.session.user;

        // Get attendance filters from request body
        const attendanceFilters = req.body as Partial<ListAttendanceParams> & { convertExcel?: boolean };

        if (attendanceFilters.convertExcel) {
          const buffer = await exportAttendanceExcelService({
            userId: user.id,
            role: user.role,
            filters: attendanceFilters
          });

          return reply
            .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            .header('Content-Disposition', 'attachment; filename="Attendance List.xlsx"')
            .send(buffer);
        }

        // Fetch employees - if employeeId filter provided, fetch only that employee
        // Map status filter to statusOnDuty boolean for employee filtering
        const statusOnDuty = attendanceFilters.status?.map(s => s === 'on_duty');
        const employeesData = await listEmployeesService({
          userId: user.id,
          role: user.role,
          limit: attendanceFilters.employeeId ? 1 : (attendanceFilters.limit || 10),
          page: attendanceFilters.page || 0,
          ...(attendanceFilters.employeeId && { employeeId: Array.isArray(attendanceFilters.employeeId) ? attendanceFilters.employeeId[0] : attendanceFilters.employeeId }),
          ...(statusOnDuty && statusOnDuty.length > 0 && { statusOnDuty }),
          ...(attendanceFilters.category && { category: attendanceFilters.category }),
          ...(attendanceFilters.position && { position: attendanceFilters.position }),
          ...(attendanceFilters.location && { location: attendanceFilters.location }),
          ...(attendanceFilters.subContractorId && { subContractorId: attendanceFilters.subContractorId }),
          ...(attendanceFilters.vesselId && { vesselId: attendanceFilters.vesselId }),
          ...(attendanceFilters.projectId && { projectId: attendanceFilters.projectId }),
          ...(attendanceFilters.search && { search: attendanceFilters.search }),
        });

        // Fetch all attendance data for the filtered employee(s)
        // Remove date filters to get all attendance history
        const { date_start, date_end, ...filtersWithoutDate } = attendanceFilters;
        
        // Get all employee IDs from the filtered employees
        const employeeIds = employeesData.data.map(e => e.id);
        
        // Fetch attendance data for the filtered employees
        // If employeeId filter exists, use pagination from input; otherwise get all records for the filtered employees
        const hasEmployeeIdFilter = !!attendanceFilters.employeeId;
        
        // When no employeeId filter: get ALL attendance records for the employees on current page
        // Then take only the most recent one for each employee
        // Use a high limit (99999) to fetch all records - service will apply default pagination when employeeId is provided
        const attendanceData = await listAttendanceService({
          ...filtersWithoutDate,
          ...(employeeIds.length > 0 && { employeeId: employeeIds }),
          ...(hasEmployeeIdFilter && {
            limit: filtersWithoutDate.limit,
            page: filtersWithoutDate.page,
          }),
          // When no employeeId filter, get all attendance records for the filtered employees (use high limit)
          ...(!hasEmployeeIdFilter && {
            limit: 1000,
            page: undefined,
          }),
        });

        // Group attendance records by employeeId
        const attendanceByEmployee = new Map<string, any[]>();
        for (const record of attendanceData.data) {
          const empId = record.employeeId;
          if (!attendanceByEmployee.has(empId)) {
            attendanceByEmployee.set(empId, []);
          }
          attendanceByEmployee.get(empId)?.push(record);
        }

        // Combine employees with their attendance records
        // If employeeId is provided with limit/page, apply pagination to attendanceHistory
        // If NO employeeId filter: only take the MOST RECENT attendance record (slice(0, 1))
        const employeesWithAttendance = employeesData.data.map(employee => {
          const attendanceHistory = attendanceByEmployee.get(employee.id) || [];
          
          // Sort by createdAt descending to get most recent first
          const sortedHistory = [...attendanceHistory].sort((a: any, b: any) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          const lastOnDuty = sortedHistory.find((r: any) => r.statusAfter === 'on_duty');
          // Filter out dummy initial status record created on employee creation
          const realOffDutyList = sortedHistory.filter((r: any) => 
            r.statusAfter === 'off_duty' && r.notes !== 'Initial status on employee creation'
          );
          const lastOffDuty = realOffDutyList.length > 0 ? realOffDutyList[0] : null;
          
          let historyToReturn = sortedHistory;
          // When no employeeId filter, only show the most recent attendance record
          if (!hasEmployeeIdFilter && sortedHistory.length > 0) {
            historyToReturn = sortedHistory.slice(0, 1);
          }

          // Helper to resolve best available location name
          const resolveLocation = (record: any, emp: any) => {
            if (!record) return '-';
            if (record.workLocationName && record.workLocationName.trim() !== '') {
              return record.workLocationName.trim();
            }
            if (record.locationAttendanceName && record.locationAttendanceName !== '-' && record.locationAttendanceName.trim() !== '') {
              return record.locationAttendanceName.trim();
            }
            if (emp.location && emp.location.trim() !== '' && !/^[-+]?\d+(\.\d+)?,\s*[-+]?\d+(\.\d+)?$/.test(emp.location.trim())) {
              return emp.location.trim();
            }
            if (emp.vesselName && emp.vesselName.trim() !== '') {
              return emp.vesselName.trim();
            }
            return '-';
          };
          
          // Convert timestamps to WIB timezone
          const convertedAttendanceHistory = convertArrayTimestampsToWIB(historyToReturn);
          const convertedLastOnDuty = lastOnDuty ? convertArrayTimestampsToWIB([lastOnDuty])[0] : null;
          const convertedLastOffDuty = lastOffDuty ? convertArrayTimestampsToWIB([lastOffDuty])[0] : null;
          const convertedEmployee = convertArrayTimestampsToWIB([employee])[0];

          if (convertedLastOnDuty) {
            convertedLastOnDuty.locationAttendanceName = resolveLocation(lastOnDuty, employee);
          }
          if (convertedLastOffDuty) {
            convertedLastOffDuty.locationAttendanceName = resolveLocation(lastOffDuty, employee);
          }
          
          return {
            ...convertedEmployee,
            attendanceHistory: convertedAttendanceHistory,
            lastOnDuty: convertedLastOnDuty,
            lastOffDuty: convertedLastOffDuty,
          };
        });

        return reply.status(200).send({ 
          success: true,
          message: req.i18n.t('user.employee.attendanceAndEmployeesListed'),
          data: employeesWithAttendance,
          meta: {
            totalEmployees: employeesData.meta.total,
            totalAttendanceRecords: attendanceData.meta.total,
            page: employeesData.meta.page,
            view: employeesData.meta.view,
            totalPages: employeesData.meta.totalPages,
            date_start: attendanceData.meta.date_start,
            date_end: attendanceData.meta.date_end,
          }
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: req.i18n.t('user.employee.attendanceAndEmployeesListFailed')
        });
      }
    }),
  });
};

export default attendanceListRoute;
