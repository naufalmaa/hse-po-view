import ExcelJS from 'exceljs';
import { listEmployeesService } from './list.service.ts';
import { listAttendanceService } from '../attendance/list.service.ts';
import { db } from '../../db/index.ts';
import { subtypes } from '../../db/schema/report.schema.ts';
import { inArray } from 'drizzle-orm';

interface ExportAttendanceParams {
  userId: string;
  role: string;
  filters: any;
}

export async function exportAttendanceExcelService({ userId, role, filters }: ExportAttendanceParams) {
  // Fetch ALL employees based on filters (remove limit/page for export)
  const statusOnDuty = filters.status?.map((s: string) => s === 'on_duty');

  const employeesData = await listEmployeesService({
    userId,
    role,
    limit: 10000, // Large limit for export
    page: 0,
    ...(filters.employeeId && { employeeId: Array.isArray(filters.employeeId) ? filters.employeeId[0] : filters.employeeId }),
    ...(statusOnDuty && statusOnDuty.length > 0 && { statusOnDuty }),
    ...(filters.category && { category: filters.category }),
    ...(filters.position && { position: filters.position }),
    ...(filters.subContractorId && { subContractorId: filters.subContractorId }),
    ...(filters.vesselId && { vesselId: filters.vesselId }),
    ...(filters.projectId && { projectId: filters.projectId }),
    ...(filters.search && { search: filters.search }),
  });

  // Fetch attendance data for the employees to get locations
  const employeeIds = employeesData.data.map(e => e.id);
  const attendanceData = employeeIds.length > 0 
    ? await listAttendanceService({
        employeeId: employeeIds,
        limit: 100000, // Large limit for export
      })
    : { data: [] };

  // Group attendance records by employeeId
  const attendanceByEmployee = new Map<string, any[]>();
  for (const record of attendanceData.data) {
    const empId = record.employeeId;
    if (!attendanceByEmployee.has(empId)) {
      attendanceByEmployee.set(empId, []);
    }
    attendanceByEmployee.get(empId)?.push(record);
  }

  // Get unique project IDs to fetch names
  const projectIds = [...new Set(employeesData.data.map(e => e.projectId).filter(Boolean))];
  const projectMap = new Map<string, string>();
  if (projectIds.length > 0) {
    const projects = await db
      .select({ id: subtypes.id, name: subtypes.name })
      .from(subtypes)
      .where(inArray(subtypes.id, projectIds));
    for (const p of projects) {
      projectMap.set(p.id, p.name);
    }
  }

  // Create Workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Attendance List');

  // Define Columns
  worksheet.columns = [
    { header: 'No', key: 'no', width: 8 },
    { header: 'Pekerja', key: 'pekerja', width: 35 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Kategori', key: 'kategori', width: 15 },
    { header: 'Kapal & Project', key: 'kapalAndProject', width: 45 },
    { header: 'Hari Kerja', key: 'hariKerja', width: 15 },
    { header: 'Status OHIH Terakhir', key: 'ohihReview', width: 20 },
    { header: 'Lokasi Terakhir On Duty', key: 'lastLocationOnDuty', width: 30 },
    { header: 'Lokasi Terakhir Off Duty', key: 'lastLocationOffDuty', width: 30 },
    { header: 'Absensi On Duty Terakhir', key: 'lastDateOnDuty', width: 25 },
    { header: 'Absensi Off Duty Terakhir', key: 'lastDateOffDuty', width: 25 },
  ];

  // Add Data
  employeesData.data.forEach((employee, index) => {
    const vesselOrLocation = employee.vesselName;
    const projectName = projectMap.get(employee.projectId);
    const kapalOrProject = vesselOrLocation || projectName || '-';

    const history = attendanceByEmployee.get(employee.id) || [];
    const sortedHistory = [...history].sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const lastOnDuty = sortedHistory.find((r: any) => r.statusAfter === 'on_duty');
    const lastOffDuty = sortedHistory.find((r: any) => r.statusAfter === 'off_duty');

    worksheet.addRow({
      no: index + 1,
      pekerja: employee.employeeName,
      status: employee.statusOnDuty ? 'ON Duty' : 'OFF Duty',
      kategori: employee.category || '-',
      kapalAndProject: kapalOrProject,
      hariKerja: employee.daysOnBoard || 0,
      ohihReview: employee.ohihReview || '-',
      lastLocationOnDuty: lastOnDuty?.locationAttendanceName || '-',
      lastLocationOffDuty: lastOffDuty?.locationAttendanceName || '-',
      lastDateOnDuty: lastOnDuty?.attendanceDate || '-',
      lastDateOffDuty: lastOffDuty?.attendanceDate || '-',
    });
  });

  // Set Alignment to Left for all cells
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.alignment = { horizontal: 'left' };
      
      // Make header bold
      if (rowNumber === 1) {
        cell.font = { bold: true };
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}
