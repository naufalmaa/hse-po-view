/**
 * Script to detect ambiguities in employee duty cycles
 * Checks for inconsistencies between employeeStatus and attendance tables
 * 
 * Ambiguities detected:
 * 1. isOnDuty = true but no currentCycleStartDate
 * 2. currentCycleStartDate exists but isOnDuty = false
 * 3. Multiple consecutive on_duty records without off_duty
 * 4. Multiple consecutive off_duty records without on_duty
 * 5. Orphaned attendance records (no corresponding employeeStatus)
 * 6. Mismatch between latest attendance status and employeeStatus.isOnDuty
 */

import { db } from '../db/index.ts';
import { employees, employeeStatus, attendance } from '../db/schema/employee.schema.ts';
import { eq } from 'drizzle-orm';

interface CycleAmbiguity {
  employeeId: string;
  employeeName: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  details: Record<string, any>;
}

interface CycleCheckResult {
  totalEmployees: number;
  ambiguities: CycleAmbiguity[];
  summary: {
    critical: number;
    warning: number;
    info: number;
  };
}

async function checkCycleAmbiguities(): Promise<CycleCheckResult> {
  console.log('=== Checking Employee Duty Cycle Ambiguities ===\n');

  const ambiguities: CycleAmbiguity[] = [];

  // Get all employees
  const allEmployees = await db
    .select({
      id: employees.id,
      employeeName: employees.employeeName,
    })
    .from(employees)
    .orderBy(employees.employeeName);

  console.log(`📊 Total employees to check: ${allEmployees.length}\n`);

  // Check each employee
  for (const employee of allEmployees) {
    const employeeId = employee.id;
    const employeeName = employee.employeeName || 'N/A';

    try {
      // 1. Check employeeStatus record
      const [status] = await db
        .select()
        .from(employeeStatus)
        .where(eq(employeeStatus.employeeId, employeeId));

      if (status) {
        // Check 1: isOnDuty = true but no currentCycleStartDate
        if (status.isOnDuty === true && !status.currentCycleStartDate) {
          ambiguities.push({
            employeeId,
            employeeName,
            type: 'MISSING_CYCLE_START',
            severity: 'critical',
            description: 'Employee is ON DUTY but currentCycleStartDate is not set',
            details: {
              isOnDuty: status.isOnDuty,
              currentCycleStartDate: status.currentCycleStartDate,
              lastCheckIn: status.lastCheckIn,
              updatedAt: status.updatedAt,
            },
          });
        }

        // Check 2: currentCycleStartDate exists but isOnDuty = false
        if (status.isOnDuty === false && status.currentCycleStartDate) {
          ambiguities.push({
            employeeId,
            employeeName,
            type: 'ORPHANED_CYCLE_START',
            severity: 'warning',
            description: 'Employee is OFF DUTY but currentCycleStartDate is still set',
            details: {
              isOnDuty: status.isOnDuty,
              currentCycleStartDate: status.currentCycleStartDate,
              lastCheckOut: status.lastCheckOut,
              updatedAt: status.updatedAt,
            },
          });
        }

        // Check 3: lastCheckIn is null when isOnDuty is true
        if (status.isOnDuty === true && !status.lastCheckIn) {
          ambiguities.push({
            employeeId,
            employeeName,
            type: 'MISSING_LAST_CHECKIN',
            severity: 'warning',
            description: 'Employee is ON DUTY but lastCheckIn is not recorded',
            details: {
              isOnDuty: status.isOnDuty,
              lastCheckIn: status.lastCheckIn,
              currentCycleStartDate: status.currentCycleStartDate,
            },
          });
        }

        // Check 4: lastCheckOut is null when isOnDuty is false
        if (status.isOnDuty === false && !status.lastCheckOut) {
          ambiguities.push({
            employeeId,
            employeeName,
            type: 'MISSING_LAST_CHECKOUT',
            severity: 'info',
            description: 'Employee is OFF DUTY but lastCheckOut is not recorded',
            details: {
              isOnDuty: status.isOnDuty,
              lastCheckOut: status.lastCheckOut,
            },
          });
        }
      }

      // 2. Check attendance records
      const attendanceRecords = await db
        .select()
        .from(attendance)
        .where(eq(attendance.employeeId, employeeId))
        .orderBy(attendance.attendanceDate, attendance.createdAt);

      // Check 3: Multiple consecutive on_duty or off_duty records
      let previousStatus: string | null = null;
      let consecutiveCount = 0;

      for (let i = 0; i < attendanceRecords.length; i++) {
        const record = attendanceRecords[i];
        const currentStatus = record.statusAfter;

        if (currentStatus === previousStatus) {
          consecutiveCount++;
          if (consecutiveCount === 1) {
            // Report on the second consecutive record
            ambiguities.push({
              employeeId,
              employeeName,
              type: `CONSECUTIVE_${currentStatus.toUpperCase()}`,
              severity: 'warning',
              description: `Multiple consecutive "${currentStatus}" records detected (no alternation between on_duty and off_duty)`,
              details: {
                dates: [
                  attendanceRecords[i - 1]?.attendanceDate,
                  attendanceRecords[i]?.attendanceDate,
                  ...(i + 1 < attendanceRecords.length ? [attendanceRecords[i + 1]?.attendanceDate] : []),
                ].filter(Boolean),
                recordCount: consecutiveCount + 1,
                recordIndex: i - consecutiveCount,
              },
            });
          }
        } else {
          consecutiveCount = 0;
        }

        previousStatus = currentStatus;
      }

      // Check 5: Mismatch between latest attendance and employeeStatus
      if (attendanceRecords.length > 0 && status) {
        const latestAttendance = attendanceRecords[attendanceRecords.length - 1];
        const attendanceStatus = latestAttendance.statusAfter === 'on_duty';
        const dbStatus = status.isOnDuty;

        if (attendanceStatus !== dbStatus) {
          ambiguities.push({
            employeeId,
            employeeName,
            type: 'STATUS_MISMATCH',
            severity: 'critical',
            description: 'Latest attendance status does not match employeeStatus.isOnDuty',
            details: {
              latestAttendanceStatus: latestAttendance.statusAfter,
              latestAttendanceDate: latestAttendance.attendanceDate,
              employeeStatusIsOnDuty: status.isOnDuty,
              statusLastUpdated: status.updatedAt,
              attendanceLastUpdated: latestAttendance.updatedAt,
            },
          });
        }
      }

      // Check 6: Multiple on_duty records on same day
      const attendanceByDate = new Map<string, any[]>();
      for (const record of attendanceRecords) {
        const date = record.attendanceDate?.toString() || 'unknown';
        if (!attendanceByDate.has(date)) {
          attendanceByDate.set(date, []);
        }
        attendanceByDate.get(date)!.push(record);
      }

      for (const [date, records] of attendanceByDate) {
        const onDutyCount = records.filter(r => r.statusAfter === 'on_duty').length;
        const offDutyCount = records.filter(r => r.statusAfter === 'off_duty').length;

        if (onDutyCount > 1) {
          ambiguities.push({
            employeeId,
            employeeName,
            type: 'MULTIPLE_ON_DUTY_SAME_DAY',
            severity: 'warning',
            description: `Multiple on_duty records on the same day (${date})`,
            details: {
              date,
              onDutyCount,
              offDutyCount,
              times: records.map(r => r.createdAt?.toISOString()),
            },
          });
        }

        if (offDutyCount > 1) {
          ambiguities.push({
            employeeId,
            employeeName,
            type: 'MULTIPLE_OFF_DUTY_SAME_DAY',
            severity: 'warning',
            description: `Multiple off_duty records on the same day (${date})`,
            details: {
              date,
              onDutyCount,
              offDutyCount,
              times: records.map(r => r.createdAt?.toISOString()),
            },
          });
        }
      }

    } catch (error) {
      console.error(`❌ Error checking employee ${employeeName} (${employeeId}):`, error);
      ambiguities.push({
        employeeId,
        employeeName,
        type: 'CHECK_ERROR',
        severity: 'critical',
        description: `Error occurred while checking cycle ambiguities`,
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  // Count by severity
  const summary = {
    critical: ambiguities.filter(a => a.severity === 'critical').length,
    warning: ambiguities.filter(a => a.severity === 'warning').length,
    info: ambiguities.filter(a => a.severity === 'info').length,
  };

  return {
    totalEmployees: allEmployees.length,
    ambiguities,
    summary,
  };
}

function printResults(result: CycleCheckResult) {
  console.log('\n=== RESULTS ===\n');
  console.log(`📊 Total Employees Checked: ${result.totalEmployees}`);
  console.log(`📋 Total Ambiguities Found: ${result.ambiguities.length}\n`);

  console.log('Severity Breakdown:');
  console.log(`  🔴 Critical: ${result.summary.critical}`);
  console.log(`  🟡 Warning: ${result.summary.warning}`);
  console.log(`  🔵 Info: ${result.summary.info}\n`);

  if (result.ambiguities.length === 0) {
    console.log('✅ No ambiguities detected! All duty cycles are consistent.\n');
    return;
  }

  // Group by type
  const groupedByType = new Map<string, CycleAmbiguity[]>();
  for (const ambiguity of result.ambiguities) {
    if (!groupedByType.has(ambiguity.type)) {
      groupedByType.set(ambiguity.type, []);
    }
    groupedByType.get(ambiguity.type)!.push(ambiguity);
  }

  // Print by type and severity
  for (const [type, items] of groupedByType) {
    const criticalCount = items.filter(a => a.severity === 'critical').length;
    const warningCount = items.filter(a => a.severity === 'warning').length;
    const infoCount = items.filter(a => a.severity === 'info').length;

    console.log(`\n${'='.repeat(70)}`);
    console.log(`🔍 ${type}`);
    console.log(`   Count: ${items.length} | Critical: ${criticalCount} | Warning: ${warningCount} | Info: ${infoCount}`);
    console.log('='.repeat(70));

    // Show first 5 examples for each type
    const limit = Math.min(5, items.length);
    for (let i = 0; i < limit; i++) {
      const amb = items[i];
      const icon = amb.severity === 'critical' ? '🔴' : amb.severity === 'warning' ? '🟡' : '🔵';
      console.log(`\n${icon} [${amb.severity.toUpperCase()}] ${amb.employeeName} (${amb.employeeId})`);
      console.log(`   📝 ${amb.description}`);
      console.log(`   Details:`);
      for (const [key, value] of Object.entries(amb.details)) {
        if (Array.isArray(value)) {
          console.log(`     • ${key}: [${value.map(v => v?.toString?.() || v).join(', ')}]`);
        } else if (typeof value === 'object' && value !== null) {
          console.log(`     • ${key}: ${JSON.stringify(value)}`);
        } else {
          console.log(`     • ${key}: ${value}`);
        }
      }
    }

    if (items.length > 5) {
      console.log(`\n   ... and ${items.length - 5} more`);
    }
  }

  // Recommendations
  console.log(`\n\n${'='.repeat(70)}`);
  console.log('💡 RECOMMENDATIONS');
  console.log('='.repeat(70));

  if (result.summary.critical > 0) {
    console.log(`\n🔴 CRITICAL ISSUES (${result.summary.critical} issues):`);
    console.log('   These must be fixed to ensure data consistency:');
    console.log('   • MISSING_CYCLE_START: Set currentCycleStartDate for employees ON DUTY');
    console.log('   • ORPHANED_CYCLE_START: Clear currentCycleStartDate for employees OFF DUTY');
    console.log('   • STATUS_MISMATCH: Align employeeStatus.isOnDuty with latest attendance record');
    console.log('   • CHECK_ERROR: Investigate errors and retry check');
  }

  if (result.summary.warning > 0) {
    console.log(`\n🟡 WARNINGS (${result.summary.warning} issues):`);
    console.log('   These should be reviewed and corrected:');
    console.log('   • CONSECUTIVE_ON_DUTY/OFF_DUTY: Review attendance flow, should alternate');
    console.log('   • MISSING_LAST_CHECKIN: Record check-in time for employees ON DUTY');
    console.log('   • MULTIPLE_ON_DUTY_SAME_DAY: Consolidate duplicate same-day records');
  }

  if (result.summary.info > 0) {
    console.log(`\n🔵 INFO (${result.summary.info} issues):`);
    console.log('   These are for information only:');
    console.log('   • MISSING_LAST_CHECKOUT: Minor - not critical but good to have');
  }
}

// Run the script
checkCycleAmbiguities()
  .then((result) => {
    printResults(result);
    console.log('\n=== Script completed successfully! ===\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
