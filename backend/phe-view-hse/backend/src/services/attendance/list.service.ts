import type { ListAttendanceParams } from '../../types/employee.ts';
import { db } from '../../db/index.ts';
import { attendance, employees, employeeStatus } from '../../db/schema/employee.schema.ts';
import { subContractors, locations } from '../../db/schema/auth.schema.ts';
import { workLocations } from '../../db/schema/report.schema.ts';
import { eq, and, desc, count, inArray, gte, lte } from 'drizzle-orm';
import env from '../../config/env.config.ts';

// Helper function to calculate distance in meters using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export async function listAttendanceService(params: ListAttendanceParams): Promise<{
  data: any[];
  meta: {
    total: number;
    page: number;
    view: number;
    totalPages: number;
    date_start: string;
    date_end: string;
  };
}> {
  const {
    employeeId,
    limit = 10,
    page = 0,
    date_start,
    date_end,
    status,
  } = params;

  const offset = page * limit;
  const whereConditions: any[] = [];

  // Filter by employee (single ID or array of IDs)
  if (employeeId) {
    if (Array.isArray(employeeId)) {
      whereConditions.push(inArray(attendance.employeeId, employeeId));
    } else {
      whereConditions.push(eq(attendance.employeeId, employeeId));
    }
  }

  // Date range filter - attendanceDate is stored as date string
  if (date_start) {
    whereConditions.push(gte(attendance.attendanceDate, date_start));
  }

  if (date_end) {
    whereConditions.push(lte(attendance.attendanceDate, date_end));
  }

  // Status filter
  if (Array.isArray(status) && status.length > 0) {
    whereConditions.push(inArray(attendance.statusAfter, status));
  }

  const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

  const total = Number(
    (await db.select({ count: count() }).from(attendance).where(whereClause))[0].count
  );
  const totalPages = Math.ceil(total / limit);

  const rows = await db
    .select({
      id: attendance.id,
      employeeId: attendance.employeeId,
      attendanceDate: attendance.attendanceDate,
      statusAfter: attendance.statusAfter,
      photoEvidence: attendance.photoEvidence,
      locationAttendance: attendance.position,
      notes: attendance.notes,
      workLocationId: attendance.workLocationId,
      createdAt: attendance.createdAt,
    })
    .from(attendance)
    .where(whereClause)
    .orderBy(desc(attendance.createdAt))
    .limit(limit)
    .offset(offset);

  // Calculate days on board for each attendance record
  // Logic:
  // - For each on_duty record: DOB = days from attendanceDate until next off_duty (or today if no off_duty)
  // - For off_duty records: DOB = null
  // - Verify with employeeStatus.currentCycleStartDate to ensure cycle accuracy
  const daysOnBoardMap = new Map<string, number | null>();
  const uniqueEmployeeIds = [...new Set(rows.map(r => r.employeeId))];

  // Get currentCycleStartDate for all employees in one query
  const employeeStatusMap = new Map<string, string | null>();
  if (uniqueEmployeeIds.length > 0) {
    const statusRecords = await db
      .select({
        employeeId: employeeStatus.employeeId,
        currentCycleStartDate: employeeStatus.currentCycleStartDate,
      })
      .from(employeeStatus)
      .where(inArray(employeeStatus.employeeId, uniqueEmployeeIds));

    for (const record of statusRecords) {
      employeeStatusMap.set(record.employeeId, record.currentCycleStartDate);
    }
  }

  for (const empId of uniqueEmployeeIds) {
    try {
      const currentCycleStartDate = employeeStatusMap.get(empId);

      // Get all attendance history for this employee, ordered by date ascending
      const attendanceHistory = await db
        .select({
          id: attendance.id,
          attendanceDate: attendance.attendanceDate,
          statusAfter: attendance.statusAfter,
        })
        .from(attendance)
        .where(eq(attendance.employeeId, empId))
        .orderBy(attendance.attendanceDate, attendance.createdAt);

      // Find the next off_duty date for each on_duty record
      for (let i = 0; i < attendanceHistory.length; i++) {
        const record = attendanceHistory[i];
        const recordKey = `${empId}_${record.id}`;

        if (record.statusAfter === 'off_duty') {
          // Find the preceding on_duty record
          let prevOnDutyDate: string | null = null;
          for (let j = i - 1; j >= 0; j--) {
            if (attendanceHistory[j].statusAfter === 'on_duty') {
              prevOnDutyDate = attendanceHistory[j].attendanceDate;
              break;
            }
          }
          if (prevOnDutyDate) {
            const startDate = new Date(prevOnDutyDate);
            const endDate = new Date(record.attendanceDate);
            const diffTime = endDate.getTime() - startDate.getTime();
            let diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
            if (isNaN(diffDays)) diffDays = 0;
            daysOnBoardMap.set(recordKey, diffDays > 0 ? diffDays : 1);
          } else {
            daysOnBoardMap.set(recordKey, null);
          }
        } else if (record.statusAfter === 'on_duty') {
          // Find the next off_duty after this on_duty
          let nextOffDutyDate: string | null = null;
          for (let j = i + 1; j < attendanceHistory.length; j++) {
            if (attendanceHistory[j].statusAfter === 'off_duty') {
              nextOffDutyDate = attendanceHistory[j].attendanceDate;
              break;
            }
          }

          // Calculate DOB: from this record's date until next off_duty or today
          const recordDate = new Date(record.attendanceDate);
          const endDate = nextOffDutyDate ? new Date(nextOffDutyDate) : new Date();
          const diffTime = endDate.getTime() - recordDate.getTime();
          let diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
          if (isNaN(diffDays)) diffDays = 0;

          // Verify with employeeStatus: if this record is in current cycle, use current DOB
          if (currentCycleStartDate && record.attendanceDate >= currentCycleStartDate) {
            // This record is in the current active cycle
            const cycleStart = new Date(currentCycleStartDate);
            const today = new Date();
            const currentDiffTime = today.getTime() - cycleStart.getTime();
            let currentDiffDays = Math.floor(currentDiffTime / (1000 * 60 * 60 * 24)) + 1;
            if (isNaN(currentDiffDays)) currentDiffDays = 0;
            daysOnBoardMap.set(recordKey, currentDiffDays > 0 ? currentDiffDays : 1);
          } else {
            // Historical cycle: calculate based on next off_duty or use diffDays
            daysOnBoardMap.set(recordKey, diffDays > 0 ? diffDays : 1);
          }
        }
      }
    } catch (error) {
      console.error(`Error calculating days on board for employee ${empId}:`, error);
    }
  }

  // Fetch all active locations to compare with attendance coordinates
  const activeLocations = await db
    .select({
      id: locations.id,
      name: locations.name,
      geometry: locations.geometry,
    })
    .from(locations);

  // Parse location geometries
  const parsedLocations = activeLocations.map(loc => {
    let lat = 0;
    let lon = 0;
    if (loc.geometry && loc.geometry.startsWith('POINT')) {
      const match = loc.geometry.match(/\(([^)]+)\)/);
      if (match) {
        const coords = match[1].trim().split(/\s+/);
        lon = parseFloat(coords[0]);
        lat = parseFloat(coords[1]);
      }
    }
    return { ...loc, lat, lon };
  }).filter(loc => loc.lat !== 0 && loc.lon !== 0);

  // Get employee details for each attendance record
  const data = await Promise.all(
    rows.map(async (row) => {
      const [employee] = await db
        .select({
          id: employees.id,
          employeeName: employees.employeeName,
          position: employees.position,
          subContractorId: employees.subContractorId,
        })
        .from(employees)
        .where(eq(employees.id, row.employeeId));

      const [contractor] = employee?.subContractorId
        ? await db
          .select({ name: subContractors.name })
          .from(subContractors)
          .where(eq(subContractors.id, employee.subContractorId))
        : [undefined];

      // Build photoEvidence URL if exists
      const BASE_URL = `${env.server.uploadsUrl}/${env.server.uploadsAttendanceDir}`;
      const photoEvidenceUrl = row.photoEvidence
        ? `${BASE_URL}/${row.employeeId}/${row.photoEvidence}`
        : undefined;

      // Get DOB for this specific attendance record
      const recordKey = `${row.employeeId}_${row.id}`;
      const daysOnBoard = daysOnBoardMap.get(recordKey);

      let positionData = row.locationAttendance as any;
      // Handle stringified JSON if necessary
      if (typeof positionData === 'string') {
        try {
          positionData = JSON.parse(positionData);
        } catch (e) {
          // ignore
        }
      }

      let locationAttendanceName = '-';

      if (positionData && typeof positionData === 'object' && positionData.latitude && positionData.longitude) {
        const lat = parseFloat(positionData.latitude);
        const lon = parseFloat(positionData.longitude);

        let minDistance = 5000; // Threshold 5km
        let nearestLocation = null;

        for (const loc of parsedLocations) {
          const dist = calculateDistance(lat, lon, loc.lat, loc.lon);
          if (dist < minDistance) {
            minDistance = dist;
            nearestLocation = loc.name;
          }
        }

        if (nearestLocation) {
          locationAttendanceName = nearestLocation;
        }
      }

      let workLocationName: string | null = null;
      if (row.workLocationId) {
        const [wl] = await db
          .select({ name: workLocations.name })
          .from(workLocations)
          .where(eq(workLocations.id, row.workLocationId));
        workLocationName = wl?.name ?? null;
      }

      return {
        ...row,
        employeeName: employee?.employeeName ?? '',
        position: employee?.position ?? '',
        subContractorName: contractor?.name ?? '',
        photoEvidence: photoEvidenceUrl,
        daysOnBoard: daysOnBoard ?? null,
        locationAttendance: row.locationAttendance, // Original coordinate
        locationAttendanceName: locationAttendanceName, // Resolved name
        workLocationId: row.workLocationId ?? null,
        workLocationName: workLocationName,
      };
    })
  );

  // Get date range from data
  const dates = rows.map(r => r.attendanceDate).filter(Boolean).sort();
  const defaultStart = dates[0] ?? '';
  const defaultEnd = dates[dates.length - 1] ?? '';
  const finalStart = date_start ?? defaultStart;
  const finalEnd = date_end ?? defaultEnd;

  return {
    data,
    meta: {
      total,
      page,
      view: limit,
      totalPages,
      date_start: finalStart,
      date_end: finalEnd,
    },
  };
}
