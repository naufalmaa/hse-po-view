/**
 * Script to check if employees from pob.json exist in the database
 * and verify their status in employee_status table
 */

import { db } from '../db/index.ts';
import { employees, employeeStatus } from '../db/schema/employee.schema.ts';
import { subContractors } from '../db/schema/auth.schema.ts';
import { eq, ilike, and } from 'drizzle-orm';
import pobData from './pob.json' with { type: 'json' };

interface PobEmployee {
  name: string;
  startDate: string;
}

async function checkPobEmployees() {
  const SUBCONTRACTOR_NAME = 'PT Rejeki Abadi Sakti';
  
  console.log('=== Checking POB Employees ===\n');
  console.log(`Subcontractor: ${SUBCONTRACTOR_NAME}`);
  console.log(`Total employees in pob.json: ${pobData.length}\n`);

  // Get subcontractor ID
  const [subcontractor] = await db
    .select({ id: subContractors.id })
    .from(subContractors)
    .where(ilike(subContractors.name, SUBCONTRACTOR_NAME))
    .limit(1);

  if (!subcontractor) {
    console.error(`Subcontractor "${SUBCONTRACTOR_NAME}" not found!`);
    process.exit(1);
  }

  console.log(`Found subcontractor ID: ${subcontractor.id}\n`);

  const results = {
    found: [] as any[],
    notFound: [] as PobEmployee[],
    hasStatus: [] as any[],
    noStatus: [] as any[],
  };

  for (const pobEmployee of pobData as PobEmployee[]) {
    const { name, startDate } = pobEmployee;

    // Try exact match first with subcontractor filter
    let [employee] = await db
      .select({
        id: employees.id,
        employeeName: employees.employeeName,
        statusOnDuty: employees.statusOnDuty,
        category: employees.category,
        position: employees.position,
      })
      .from(employees)
      .where(and(
        ilike(employees.employeeName, name),
        eq(employees.subContractorId, subcontractor.id)
      ))
      .limit(1);

    // If no exact match, try partial match with subcontractor filter
    if (!employee) {
      const searchName = name.split(' ')[0]; // Use first name for partial search
      [employee] = await db
        .select({
          id: employees.id,
          employeeName: employees.employeeName,
          statusOnDuty: employees.statusOnDuty,
          category: employees.category,
          position: employees.position,
        })
        .from(employees)
        .where(and(
          ilike(employees.employeeName, `%${searchName}%`),
          eq(employees.subContractorId, subcontractor.id)
        ))
        .limit(1);
    }

    if (employee) {
      results.found.push({
        pobName: name,
        pobStartDate: startDate,
        ...employee,
      });

      // Check employee_status
      const [status] = await db
        .select()
        .from(employeeStatus)
        .where(eq(employeeStatus.employeeId, employee.id))
        .limit(1);

      if (status) {
        results.hasStatus.push({
          pobName: name,
          pobStartDate: startDate,
          employeeId: employee.id,
          employeeName: employee.employeeName,
          isOnDuty: status.isOnDuty,
          currentCycleStartDate: status.currentCycleStartDate,
          lastCheckIn: status.lastCheckIn,
          lastCheckOut: status.lastCheckOut,
        });
      } else {
        results.noStatus.push({
          pobName: name,
          pobStartDate: startDate,
          employeeId: employee.id,
          employeeName: employee.employeeName,
          statusOnDuty: employee.statusOnDuty,
        });
      }
    } else {
      results.notFound.push({ name, startDate });
    }
  }

  // Print Summary
  console.log('=== SUMMARY ===\n');
  console.log(`Found in employees table: ${results.found.length}/${pobData.length}`);
  console.log(`Not found: ${results.notFound.length}/${pobData.length}`);
  console.log(`Has employee_status record: ${results.hasStatus.length}/${results.found.length}`);
  console.log(`Missing employee_status record: ${results.noStatus.length}/${results.found.length}`);

  // Print detailed results
  console.log('\n=== DETAILED RESULTS ===\n');

  if (results.notFound.length > 0) {
    console.log('--- NOT FOUND IN EMPLOYEES TABLE ---');
    results.notFound.forEach((emp, idx) => {
      console.log(`${idx + 1}. ${emp.name} (Start: ${emp.startDate})`);
    });
    console.log('');
  }

  if (results.noStatus.length > 0) {
    console.log('--- FOUND BUT NO EMPLOYEE_STATUS RECORD ---');
    results.noStatus.forEach((emp, idx) => {
      console.log(`${idx + 1}. ${emp.pobName} → DB: ${emp.employeeName} (ID: ${emp.employeeId})`);
      console.log(`Status On Duty: ${emp.statusOnDuty}`);
    });
    console.log('');
  }

  if (results.hasStatus.length > 0) {
    console.log('--- FOUND WITH EMPLOYEE_STATUS RECORD ---');
    results.hasStatus.forEach((emp, idx) => {
      console.log(`${idx + 1}. ${emp.pobName} → DB: ${emp.employeeName}`);
      console.log(`   Employee ID: ${emp.employeeId}`);
      console.log(`   Is On Duty: ${emp.isOnDuty}`);
      console.log(`   Current Cycle Start: ${emp.currentCycleStartDate || 'N/A'}`);
      console.log(`   POB Start Date: ${emp.pobStartDate}`);
      console.log('');
    });
  }

  // Export results as JSON
  console.log('=== EXPORT RESULTS ===\n');
  console.log('Full results object available for export');

  return results;
}

// Run the script
checkPobEmployees()
  .then((results) => {
    console.log('\nScript completed successfully!');
    // Optionally save to file
    // await Bun.write('pob-check-results.json', JSON.stringify(results, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
