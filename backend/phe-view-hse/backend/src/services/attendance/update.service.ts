import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  employees,
  attendance,
} from '../../db/schema/employee.schema.ts';
import type { AttendanceStatus } from '../../types/employee.ts';
import { getTimestampFilename } from '../../utils/utils.ts';
import env from '../../config/env.config.ts';
import { recalculateLogManhoursForDate } from '../daily-report/logManhoursTrigger.service.ts';
import { syncEmployeeStatus } from './admin-manage.service.ts';

export interface UpdateAttendanceParams {
  employeeId: string;
  status: AttendanceStatus;
  photoEvidence?: {
    buffer: Buffer;
    filename: string;
    mimetype: string;
  };
  notes?: string;
  position?: {
    latitude: number;
    longitude: number;
  };
  workLocationId?: string | null;
  statusChangeDate?: string; // Optional date for status change (YYYY-MM-DD format)
}

export async function updateAttendanceService(params: UpdateAttendanceParams): Promise<{
  success: boolean;
  message?: string;  // This will be overridden by route
  data?: {
    id: string;
    employeeId: string;
    attendanceDate: string;
    statusAfter: AttendanceStatus;
    photoEvidence?: string;
    notes?: string;
    createdAt: string;
  };
}> {
  const { employeeId, status, photoEvidence, notes, position, statusChangeDate } = params;

  // Use statusChangeDate if provided, otherwise use today
  const effectiveDate = statusChangeDate ?? new Date().toISOString().slice(0, 10);

  // Check if employee exists
  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.id, employeeId));

  if (!employee) {
    return {
      success: false,
      message: 'Employee not found',
    };
  }

  // Process photo evidence if provided
  let photoEvidencePath: string | null = null;
  if (photoEvidence) {
    const attendanceFolder = path.resolve(process.cwd(), '../uploads', 'attendance', employeeId);
    const thumbnailFolder = path.resolve(attendanceFolder, 'thumbnail');
    await fs.mkdir(attendanceFolder, { recursive: true });
    await fs.mkdir(thumbnailFolder, { recursive: true });

    const renamed = getTimestampFilename(photoEvidence.filename);

    // Compress and save main image (quality 80)
    if (photoEvidence.mimetype?.startsWith('image/')) {
      await sharp(photoEvidence.buffer)
        .jpeg({ quality: 80 })
        .toFile(path.resolve(attendanceFolder, renamed));

      // Create thumbnail (resize 300)
      await sharp(photoEvidence.buffer)
        .resize(300)
        .jpeg({ quality: 80 })
        .toFile(path.resolve(thumbnailFolder, renamed));
    } else {
      await fs.writeFile(path.resolve(attendanceFolder, renamed), photoEvidence.buffer);
    }

    photoEvidencePath = renamed;
  }

  // Insert attendance record
  const [attendanceRecord] = await db
    .insert(attendance)
    .values({
      employeeId,
      attendanceDate: effectiveDate,
      statusAfter: status,
      workLocationId: params.workLocationId || null,
      photoEvidence: photoEvidencePath,
      notes: notes ?? null,
      position: position ? (typeof position === 'string' ? position : JSON.stringify(position)) : null,
    })
    .returning({
      id: attendance.id,
      employeeId: attendance.employeeId,
      attendanceDate: attendance.attendanceDate,
      statusAfter: attendance.statusAfter,
      photoEvidence: attendance.photoEvidence,
      notes: attendance.notes,
      createdAt: attendance.createdAt,
    });

  // Sync employee status and location ("Lokasi Barge")
  await syncEmployeeStatus(employeeId);

  // Trigger recalculation of log_manhours for this date
  await recalculateLogManhoursForDate(effectiveDate);

  // Build photoEvidence URL if exists
  const BASE_URL = `${env.server.uploadsUrl}/${env.server.uploadsAttendanceDir}`;
  const photoEvidenceUrl = attendanceRecord.photoEvidence
    ? `${BASE_URL}/${employeeId}/${attendanceRecord.photoEvidence}`
    : undefined;

  return {
    success: true,
    data: {
      id: attendanceRecord.id,
      employeeId: attendanceRecord.employeeId,
      attendanceDate: attendanceRecord.attendanceDate?.toString() ?? effectiveDate,
      statusAfter: attendanceRecord.statusAfter,
      photoEvidence: photoEvidenceUrl,
      notes: attendanceRecord.notes ?? undefined,
      createdAt: attendanceRecord.createdAt!.toISOString(),
    },
  };
}
