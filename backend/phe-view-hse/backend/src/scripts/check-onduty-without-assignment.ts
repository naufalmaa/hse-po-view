/**
 * Script to check crew members who are ON DUTY and their project/vessel assignment status
 * This provides a complete breakdown of all ON DUTY crew and their assignment patterns
 */

import { db } from '../db/index.ts';
import { employees } from '../db/schema/employee.schema.ts';
import { subContractors } from '../db/schema/auth.schema.ts';
import { eq } from 'drizzle-orm';

interface CrewAssignment {
  id: string;
  employeeName: string;
  category: string;
  position: string | null;
  statusOnDuty: boolean;
  subContractorName: string;
  projectId: string | null;
  projectName: string | null;
  vesselId: string | null;
  identityNumber: string | null;
  hssePassportNumber: string | null;
}

async function checkOnDutyWithoutAssignment() {
  console.log('=== Complete ON DUTY Crew Assignment Analysis ===\n');

  // Get ALL crew who are ON DUTY
  const allOnDutyCrew = await db
    .select({
      id: employees.id,
      employeeName: employees.employeeName,
      category: employees.category,
      position: employees.position,
      statusOnDuty: employees.statusOnDuty,
      subContractorName: subContractors.name,
      projectId: employees.projectId,
      projectName: employees.projectName,
      vesselId: employees.vesselId,
      identityNumber: employees.identityNumber,
      hssePassportNumber: employees.hssePassportNumber,
    })
    .from(employees)
    .leftJoin(subContractors, eq(employees.subContractorId, subContractors.id))
    .where(eq(employees.statusOnDuty, true))
    .orderBy(employees.category, employees.employeeName);

  // Categorize crew by assignment pattern
  const withBoth: CrewAssignment[] = [];
  const withProjectOnly: CrewAssignment[] = [];
  const withVesselOnly: CrewAssignment[] = [];
  const withoutBoth: CrewAssignment[] = [];

  for (const row of allOnDutyCrew) {
    const crew: CrewAssignment = {
      id: row.id,
      employeeName: row.employeeName || 'N/A',
      category: row.category || 'N/A',
      position: row.position,
      statusOnDuty: row.statusOnDuty || false,
      subContractorName: row.subContractorName || 'N/A',
      projectId: row.projectId,
      projectName: row.projectName,
      vesselId: row.vesselId,
      identityNumber: row.identityNumber,
      hssePassportNumber: row.hssePassportNumber,
    };

    const hasProject = crew.projectId !== null;
    const hasVessel = crew.vesselId !== null;

    if (hasProject && hasVessel) {
      withBoth.push(crew);
    } else if (hasProject && !hasVessel) {
      withProjectOnly.push(crew);
    } else if (!hasProject && hasVessel) {
      withVesselOnly.push(crew);
    } else {
      withoutBoth.push(crew);
    }
  }

  const totalOnDuty = allOnDutyCrew.length;
  const totalWithAssignment = withBoth.length + withProjectOnly.length + withVesselOnly.length;
  const totalWithoutAssignment = withoutBoth.length;

  // Print comprehensive summary
  console.log('=== SUMMARY ===\n');
  console.log(`📊 TOTAL ON DUTY CREW: ${totalOnDuty}`);
  console.log('');
  console.log('Assignment Breakdown:');
  console.log(`  ✅ With BOTH projectId AND vesselId: ${withBoth.length}`);
  console.log(`  📍 With projectId ONLY: ${withProjectOnly.length}`);
  console.log(`  🚢 With vesselId ONLY: ${withVesselOnly.length}`);
  console.log(`  ❌ WITHOUT both projectId AND vesselId: ${withoutBoth.length}`);
  console.log('');
  console.log(`Total with at least one assignment: ${totalWithAssignment}`);
  console.log(`Total without any assignment: ${totalWithoutAssignment}`);
  console.log('');
  console.log(`✔️ Verification: ${withBoth.length} + ${withProjectOnly.length} + ${withVesselOnly.length} + ${withoutBoth.length} = ${totalOnDuty}`);
  console.log('');

  // Group by category for detailed breakdown
  const groupByCategory = (crews: CrewAssignment[]) => {
    return crews.reduce((acc, crew) => {
      const cat = crew.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(crew);
      return acc;
    }, {} as Record<string, CrewAssignment[]>);
  };

  // Print details for each group
  if (withBoth.length > 0) {
    console.log('=== ✅ CREW WITH BOTH PROJECT & VESSEL ===\n');
    const grouped = groupByCategory(withBoth);
    for (const [category, crews] of Object.entries(grouped)) {
      console.log(`Category: ${category} (${crews.length} crew)`);
    }
    console.log('');
  }

  if (withProjectOnly.length > 0) {
    console.log('=== 📍 CREW WITH PROJECT ONLY (No Vessel) ===\n');
    const grouped = groupByCategory(withProjectOnly);
    for (const [category, crews] of Object.entries(grouped)) {
      console.log(`--- ${category.toUpperCase()} (${crews.length} crew) ---\n`);
      crews.forEach((crew, idx) => {
        console.log(`${idx + 1}. ${crew.employeeName}`);
        console.log(`   Company: ${crew.subContractorName}`);
        console.log(`   Position: ${crew.position || 'N/A'}`);
        console.log(`   ✅ Project ID: ${crew.projectId}`);
        console.log(`   ❌ Vessel ID: NOT ASSIGNED`);
        console.log('');
      });
    }
  }

  if (withVesselOnly.length > 0) {
    console.log('=== 🚢 CREW WITH VESSEL ONLY (No Project) ===\n');
    const grouped = groupByCategory(withVesselOnly);
    for (const [category, crews] of Object.entries(grouped)) {
      console.log(`--- ${category.toUpperCase()} (${crews.length} crew) ---\n`);
      crews.forEach((crew, idx) => {
        console.log(`${idx + 1}. ${crew.employeeName}`);
        console.log(`   Company: ${crew.subContractorName}`);
        console.log(`   Position: ${crew.position || 'N/A'}`);
        console.log(`   ❌ Project ID: NOT ASSIGNED`);
        console.log(`   ✅ Vessel ID: ${crew.vesselId}`);
        console.log('');
      });
    }
  }

  if (withoutBoth.length > 0) {
    console.log('=== ❌ CREW WITHOUT ANY ASSIGNMENT ===\n');
    const grouped = groupByCategory(withoutBoth);
    for (const [category, crews] of Object.entries(grouped)) {
      console.log(`--- ${category.toUpperCase()} (${crews.length} crew) ---\n`);
      crews.forEach((crew, idx) => {
        console.log(`${idx + 1}. ${crew.employeeName}`);
        console.log(`   ID: ${crew.id}`);
        console.log(`   Company: ${crew.subContractorName}`);
        console.log(`   Position: ${crew.position || 'N/A'}`);
        console.log(`   HSSE Passport: ${crew.hssePassportNumber || 'N/A'}`);
        console.log(`   ❌ Project ID: NOT ASSIGNED`);
        console.log(`   ❌ Vessel ID: NOT ASSIGNED`);
        console.log('');
      });
    }
  }

  // Dashboard impact analysis
  console.log('=== 📊 DASHBOARD IMPACT ANALYSIS ===\n');
  console.log('Dashboard "Crew On Duty by Project" includes:');
  console.log(`  • Crew with projectId (filters: isNotNull(projectId))`);
  console.log(`  • Count: ${withBoth.length + withProjectOnly.length}`);
  console.log('');
  console.log('Dashboard "Crew On Duty by Vessel" includes:');
  console.log(`  • Crew with vesselId (filters: isNotNull(vesselId))`);
  console.log(`  • Count: ${withBoth.length + withVesselOnly.length}`);
  console.log('');
  console.log('⚠️ Crew NOT in either dashboard:');
  console.log(`  • Count: ${withoutBoth.length} crew`);
  console.log('');

  // Recommendations
  console.log('=== 💡 RECOMMENDATIONS ===\n');
  if (withProjectOnly.length > 0) {
    console.log(`⚠️ ${withProjectOnly.length} crew have PROJECT but no VESSEL:`);
    console.log('   → Check if these crew should have vessel assignment');
  }
  if (withVesselOnly.length > 0) {
    console.log(`⚠️ ${withVesselOnly.length} crew have VESSEL but no PROJECT:`);
    console.log('   → Check if these crew should have project assignment');
  }
  if (withoutBoth.length > 0) {
    console.log(`❌ ${withoutBoth.length} crew have NO assignment at all:`);
    console.log('   → These crew are invisible in dashboard summaries!');
    console.log('   → Assign appropriate projectId and/or vesselId');
  }
  console.log('');

  return {
    total: totalOnDuty,
    withBoth,
    withProjectOnly,
    withVesselOnly,
    withoutBoth,
  };
}

// Run the script
checkOnDutyWithoutAssignment()
  .then((results) => {
    console.log('=== Script completed successfully! ===');
    console.log(`Total ON DUTY crew analyzed: ${results.total}`);
    console.log(`Crew without any assignment: ${results.withoutBoth.length}\n`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
