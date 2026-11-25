/**
 * Script to migrate employee status data to attendance table
 * Creates attendance records from existing employee_status entries
 * This ensures all duty status changes are tracked in the attendance history
 */

import { db } from '../db/index.ts';
import { employees, employeeStatus, attendance } from '../db/schema/employee.schema.ts';
import { eq } from 'drizzle-orm';

async function migrateStatusToAttendance() {
  console.log('Starting migration of employee status to attendance records...');

  // Get all employee status records
  const statusRecords = await db
    .select({
      id: employeeStatus.id,
      employeeId: employeeStatus.employeeId,
      isOnDuty: employeeStatus.isOnDuty,
      lastCheckIn: employeeStatus.lastCheckIn,
      lastCheckOut: employeeStatus.lastCheckOut,
      currentCycleStartDate: employeeStatus.currentCycleStartDate,
      updatedAt: employeeStatus.updatedAt,
    })
    .from(employeeStatus);

  console.log(`Found ${statusRecords.length} employee status records`);

  let inserted = 0;
  let skipped = 0;

  for (const statusRecord of statusRecords) {
    try {
      // Get employee info
      const [employee] = await db
        .select({
          id: employees.id,
          employeeName: employees.employeeName,
        })
        .from(employees)
        .where(eq(employees.id, statusRecord.employeeId))
        .limit(1);

      if (!employee) {
        console.log(`Skipped: Employee not found for status record ${statusRecord.id}`);
        skipped++;
        continue;
      }

      // Determine attendance date and status based on employee status logic:
      // - If lastCheckOut is empty AND currentCycleStartDate exists => still ON DUTY
      // - Otherwise, check isOnDuty flag
      let attendanceDate: string;
      let statusAfter: 'on_duty' | 'off_duty';
      let notes: string;

      // Check if employee is still on duty (no checkout and has cycle start date)
      const isStillOnDuty = !statusRecord.lastCheckOut && statusRecord.currentCycleStartDate;

      if (isStillOnDuty || statusRecord.isOnDuty === true) {
        // ON DUTY - use lastCheckIn date
        statusAfter = 'on_duty';
        if (statusRecord.lastCheckIn) {
          attendanceDate = statusRecord.lastCheckIn.toISOString().split('T')[0];
        } else if (statusRecord.currentCycleStartDate) {
          attendanceDate = statusRecord.currentCycleStartDate;
        } else {
          // Skip if no valid date for ON DUTY
          console.log(`Skipped: ${employee.employeeName} - ON DUTY but no valid date found`);
          skipped++;
          continue;
        }
        notes = 'Data di-generate oleh sistem';
      } else if (statusRecord.isOnDuty === false) {
        // OFF DUTY - use lastCheckOut date
        statusAfter = 'off_duty';
        if (statusRecord.lastCheckOut) {
          attendanceDate = statusRecord.lastCheckOut.toISOString().split('T')[0];
        } else {
          // Skip if no valid checkout date for OFF DUTY
          console.log(`Skipped: ${employee.employeeName} - OFF DUTY but no checkout date found`);
          skipped++;
          continue;
        }
        notes = 'Data di-generate oleh sistem';
      } else {
        // isOnDuty is null and no valid status can be determined
        console.log(`Skipped: ${employee.employeeName} - isOnDuty is null and no valid status`);
        skipped++;
        continue;
      }

      // Check if attendance record already exists for this employee and date
      const [existingAttendance] = await db
        .select()
        .from(attendance)
        .where(eq(attendance.employeeId, statusRecord.employeeId))
        .limit(1);

      if (existingAttendance) {
        console.log(`Skipped: ${employee.employeeName} - attendance record already exists`);
        skipped++;
        continue;
      }

      // Insert attendance record
      await db.insert(attendance).values({
        employeeId: statusRecord.employeeId,
        attendanceDate: attendanceDate,
        statusAfter: statusAfter,
        photoEvidence: null, // No photo evidence for migrated data
        notes: notes,
        position: null,
        createdAt: statusRecord.updatedAt || new Date(),
        updatedAt: statusRecord.updatedAt || new Date(),
      });

      console.log(`Created: ${employee.employeeName} - ${statusAfter} on ${attendanceDate}`);
      inserted++;
    } catch (error) {
      console.error(`Error processing status record ${statusRecord.id}:`, error);
      skipped++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Total status records: ${statusRecords.length}`);
  console.log(`Attendance records created: ${inserted}`);
  console.log(`Records skipped: ${skipped}`);
  console.log('Migration complete!');

  process.exit(0);
}

// Run the script
migrateStatusToAttendance().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
