import { eq, and, desc, gte } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { employees, attendance, employeeStatus } from '../../db/schema/employee.schema.ts';
import { workLocations } from '../../db/schema/report.schema.ts';
import { locations } from '../../db/schema/auth.schema.ts';
import { recalculateLogManhoursForDate } from '../daily-report/logManhoursTrigger.service.ts';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface ManageAttendanceParams {
  action: 'create' | 'update' | 'delete';
  employeeId?: string;
  attendanceId?: string;
  statusAfter?: 'on_duty' | 'off_duty';
  attendanceDate?: string; // YYYY-MM-DD
  createdAt?: string; // ISO String
  notes?: string;
  position?: any; // JSON containing latitude/longitude or string
  workLocationId?: string | null;
}

export async function syncEmployeeStatus(employeeId: string) {
  // Query the most recent attendance record
  const [latest] = await db
    .select()
    .from(attendance)
    .where(eq(attendance.employeeId, employeeId))
    .orderBy(desc(attendance.attendanceDate), desc(attendance.createdAt))
    .limit(1);

  const isOnDuty = latest ? latest.statusAfter === 'on_duty' : false;

  // Find latest check in
  const [latestCheckInRec] = await db
    .select()
    .from(attendance)
    .where(and(eq(attendance.employeeId, employeeId), eq(attendance.statusAfter, 'on_duty')))
    .orderBy(desc(attendance.attendanceDate), desc(attendance.createdAt))
    .limit(1);

  // Find latest check out
  const [latestCheckOutRec] = await db
    .select()
    .from(attendance)
    .where(and(eq(attendance.employeeId, employeeId), eq(attendance.statusAfter, 'off_duty')))
    .orderBy(desc(attendance.attendanceDate), desc(attendance.createdAt))
    .limit(1);

  // Find the latest on_duty to get cycle start date
  let currentCycleStartDate: string | null = null;
  if (latestCheckInRec) {
    // Check if there is any off_duty after or on the same date with greater createdAt than this latest check-in
    const checkInTime = latestCheckInRec.createdAt ? new Date(latestCheckInRec.createdAt).getTime() : 0;

    const [offDutyAfter] = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.employeeId, employeeId),
          eq(attendance.statusAfter, 'off_duty'),
          gte(attendance.attendanceDate, latestCheckInRec.attendanceDate)
        )
      )
      .orderBy(desc(attendance.attendanceDate), desc(attendance.createdAt))
      .limit(1);

    const hasOffDutyAfter = offDutyAfter && (
      offDutyAfter.attendanceDate > latestCheckInRec.attendanceDate ||
      (offDutyAfter.createdAt && latestCheckInRec.createdAt && new Date(offDutyAfter.createdAt).getTime() >= checkInTime)
    );

    if (!hasOffDutyAfter) {
      currentCycleStartDate = latestCheckInRec.attendanceDate;
    }
  }

  let latestLocationName: string | null = null;
  if (latest?.workLocationId) {
    const [loc] = await db
      .select({ name: workLocations.name })
      .from(workLocations)
      .where(eq(workLocations.id, latest.workLocationId))
      .limit(1);
    if (loc?.name) {
      latestLocationName = loc.name;
    }
  } else if (latest?.position) {
    let pos = latest.position;
    if (typeof pos === 'string') {
      try {
        pos = JSON.parse(pos);
      } catch {
        // Plain string
      }
    }
    let lat: number | undefined;
    let lng: number | undefined;
    if (pos && typeof pos === 'object') {
      lat = parseFloat((pos as any).latitude ?? (pos as any).lat);
      lng = parseFloat((pos as any).longitude ?? (pos as any).lng ?? (pos as any).long);
    }

    if (lat !== undefined && !isNaN(lat) && lng !== undefined && !isNaN(lng)) {
      // Resolve nearest location within 5km from locations table
      const activeLocs = await db.select({ name: locations.name, geometry: locations.geometry }).from(locations);
      let minDistance = 5000;
      let nearest: string | null = null;
      for (const loc of activeLocs) {
        if (loc.geometry && loc.geometry.startsWith('POINT')) {
          const match = loc.geometry.match(/\(([^)]+)\)/);
          if (match) {
            const coords = match[1].trim().split(/\s+/);
            const mLong = parseFloat(coords[0]);
            const mLat = parseFloat(coords[1]);
            const dist = calculateDistance(lat, lng, mLat, mLong);
            if (dist < minDistance) {
              minDistance = dist;
              nearest = loc.name;
            }
          }
        }
      }
      if (nearest) {
        latestLocationName = nearest;
      }
    } else if (typeof pos === 'string' && pos.trim().length > 0 && !/^[-+]?\d+(\.\d+)?,\s*[-+]?\d+(\.\d+)?$/.test(pos.trim())) {
      latestLocationName = pos.trim();
    }
  }

  // Update employees table
  const updateEmpFields: any = { statusOnDuty: isOnDuty, updatedAt: new Date() };
  if (latestLocationName) {
    updateEmpFields.location = latestLocationName;
  }
  await db
    .update(employees)
    .set(updateEmpFields)
    .where(eq(employees.id, employeeId));

  // Update employeeStatus table
  const [existing] = await db.select().from(employeeStatus).where(eq(employeeStatus.employeeId, employeeId));
  if (existing) {
    await db
      .update(employeeStatus)
      .set({
        isOnDuty,
        lastCheckIn: latestCheckInRec?.createdAt || null,
        lastCheckOut: latestCheckOutRec?.createdAt || null,
        currentCycleStartDate,
        updatedAt: new Date(),
      })
      .where(eq(employeeStatus.employeeId, employeeId));
  } else {
    await db.insert(employeeStatus).values({
      employeeId,
      isOnDuty,
      lastCheckIn: latestCheckInRec?.createdAt || null,
      lastCheckOut: latestCheckOutRec?.createdAt || null,
      currentCycleStartDate,
      updatedAt: new Date(),
    });
  }
}

export async function adminManageAttendanceService(params: ManageAttendanceParams) {
  const { action, employeeId, attendanceId, statusAfter, attendanceDate, createdAt, notes, position, workLocationId } = params;

  if (action === 'create') {
    if (!employeeId || !statusAfter || !attendanceDate) {
      throw new Error('Missing required fields for create action');
    }

    const effectiveCreated = createdAt ? new Date(createdAt) : new Date();

    const [newRecord] = await db
      .insert(attendance)
      .values({
        employeeId,
        attendanceDate,
        statusAfter,
        workLocationId: workLocationId || null,
        notes: notes || null,
        position: position ? (typeof position === 'string' ? position : JSON.stringify(position)) : null,
        createdAt: effectiveCreated,
        updatedAt: effectiveCreated,
      })
      .returning();

    await syncEmployeeStatus(employeeId);
    await recalculateLogManhoursForDate(attendanceDate);

    return newRecord;
  }

  if (action === 'update') {
    if (!attendanceId) {
      throw new Error('Missing attendanceId for update action');
    }

    const [existing] = await db.select().from(attendance).where(eq(attendance.id, attendanceId));
    if (!existing) {
      throw new Error('Attendance record not found');
    }

    const updateFields: any = {
      updatedAt: new Date(),
    };

    if (attendanceDate !== undefined) updateFields.attendanceDate = attendanceDate;
    if (notes !== undefined) updateFields.notes = notes || null;
    if (position !== undefined) updateFields.position = position ? (typeof position === 'string' ? position : JSON.stringify(position)) : null;
    if (workLocationId !== undefined) updateFields.workLocationId = workLocationId || null;
    if (createdAt !== undefined) updateFields.createdAt = new Date(createdAt);
    if (statusAfter !== undefined) updateFields.statusAfter = statusAfter;

    const [updatedRecord] = await db
      .update(attendance)
      .set(updateFields)
      .where(eq(attendance.id, attendanceId))
      .returning();

    await syncEmployeeStatus(existing.employeeId);
    
    if (attendanceDate) {
      await recalculateLogManhoursForDate(attendanceDate);
    }
    if (existing.attendanceDate !== attendanceDate) {
      await recalculateLogManhoursForDate(existing.attendanceDate);
    }

    return updatedRecord;
  }

  if (action === 'delete') {
    if (!attendanceId) {
      throw new Error('Missing attendanceId for delete action');
    }

    const [existing] = await db.select().from(attendance).where(eq(attendance.id, attendanceId));
    if (!existing) {
      throw new Error('Attendance record not found');
    }

    await db.delete(attendance).where(eq(attendance.id, attendanceId));
    await syncEmployeeStatus(existing.employeeId);
    await recalculateLogManhoursForDate(existing.attendanceDate);

    return { id: attendanceId, success: true };
  }

  throw new Error('Invalid action');
}
