/**
 * Script to initialize employee_status table for employees who are currently on duty
 * This sets currentCycleStartDate to today for all employees with statusOnDuty = true
 * that don't have an existing employee_status record
 */

import { db } from '../db/index.ts';
import { employees, employeeStatus } from '../db/schema/employee.schema.ts';
import { eq } from 'drizzle-orm';

async function initEmployeeStatus() {
  console.log('Starting employee status initialization...');

  // Find all employees who are on duty
  const employeesOnDuty = await db
    .select({
      id: employees.id,
      employeeName: employees.employeeName,
      statusOnDuty: employees.statusOnDuty,
    })
    .from(employees)
    .where(
      eq(employees.statusOnDuty, true)
    );

  console.log(`Found ${employeesOnDuty.length} employees currently on duty`);

  // Find all employees who are off duty but have employee_status record
  const employeesOffDutyWithStatus = await db
    .select({
      id: employees.id,
      employeeName: employees.employeeName,
    })
    .from(employees)
    .innerJoin(employeeStatus, eq(employees.id, employeeStatus.employeeId))
    .where(
      eq(employees.statusOnDuty, false)
    );

  console.log(`Found ${employeesOffDutyWithStatus.length} employees off duty with status records to delete`);

  const now = new Date();
  const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format

  let inserted = 0;
  let skipped = 0;
  let deleted = 0;

  for (const employee of employeesOnDuty) {
    try {
      // Check if employee already has a status record
      const [existingStatus] = await db
        .select()
        .from(employeeStatus)
        .where(eq(employeeStatus.employeeId, employee.id))
        .limit(1);

      if (existingStatus) {
        // Skip existing records - do not update
        console.log(`Skipped (already exists): ${employee.employeeName} (${employee.id})`);
        skipped++;
      } else {
        // Insert new record
        await db.insert(employeeStatus).values({
          employeeId: employee.id,
          isOnDuty: true,
          currentCycleStartDate: today,
          lastCheckIn: now,
          updatedAt: now,
        });
        console.log(`Created status for: ${employee.employeeName} (${employee.id})`);
        inserted++;
      }
    } catch (error) {
      console.error(`Error processing employee ${employee.employeeName} (${employee.id}):`, error);
    }
  }

  // Delete employee_status records for employees who are off duty
  for (const employee of employeesOffDutyWithStatus) {
    try {
      await db
        .delete(employeeStatus)
        .where(eq(employeeStatus.employeeId, employee.id));
      console.log(`Deleted status for: ${employee.employeeName} (${employee.id}) - statusOnDuty is false`);
      deleted++;
    } catch (error) {
      console.error(`Error deleting status for ${employee.employeeName} (${employee.id}):`, error);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Total employees on duty: ${employeesOnDuty.length}`);
  console.log(`Records created: ${inserted}`);
  console.log(`Records skipped (already exists): ${skipped}`);
  console.log(`Records deleted (off duty): ${deleted}`);
  console.log('Done!');

  process.exit(0);
}

// Run the script
initEmployeeStatus().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
