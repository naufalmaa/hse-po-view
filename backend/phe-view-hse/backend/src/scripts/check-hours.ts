import { db } from '../db/index.ts';
import { manhours, dailyReports } from '../db/schema/report.schema.ts';
import { sql } from 'drizzle-orm';

/**
 * Check hours values in report_manhours
 * Run this script to understand the hours distribution
 */

async function checkHoursInReportManhours() {
  console.log('=== CHECKING HOURS IN report_manhours ===\n');

  // Check hours distribution for 2026 data
  const hoursStats = await db
    .select({
      avgPhe: sql<number>`AVG(${manhours.hoursPobPheOses})`,
      avgContractor: sql<number>`AVG(${manhours.hoursPobContractor})`,
      minPhe: sql<number>`MIN(${manhours.hoursPobPheOses})`,
      maxPhe: sql<number>`MAX(${manhours.hoursPobPheOses})`,
      minContractor: sql<number>`MIN(${manhours.hoursPobContractor})`,
      maxContractor: sql<number>`MAX(${manhours.hoursPobContractor})`,
      count: sql<number>`COUNT(*)`
    })
    .from(manhours)
    .innerJoin(dailyReports, sql`${manhours.reportId} = ${dailyReports.id}`)
    .where(sql`${dailyReports.reportDate} >= '2026-01-01'`);

  console.log('📊 Hours Statistics for 2026 data:');
  const stats = hoursStats[0];
  console.log(`   Count: ${stats?.count}`);
  console.log(`   hoursPobPheOses: min=${stats?.minPhe}, max=${stats?.maxPhe}, avg=${Number(stats?.avgPhe).toFixed(2)}`);
  console.log(`   hoursPobContractor: min=${stats?.minContractor}, max=${stats?.maxContractor}, avg=${Number(stats?.avgContractor).toFixed(2)}\n`);

  // Check for null/zero values
  const nullCheck = await db
    .select({
      totalNullPhe: sql<number>`SUM(CASE WHEN ${manhours.hoursPobPheOses} IS NULL THEN 1 ELSE 0 END)`,
      totalZeroPhe: sql<number>`SUM(CASE WHEN ${manhours.hoursPobPheOses} = 0 THEN 1 ELSE 0 END)`,
      totalNullContractor: sql<number>`SUM(CASE WHEN ${manhours.hoursPobContractor} IS NULL THEN 1 ELSE 0 END)`,
      totalZeroContractor: sql<number>`SUM(CASE WHEN ${manhours.hoursPobContractor} = 0 THEN 1 ELSE 0 END)`,
      count: sql<number>`COUNT(*)`
    })
    .from(manhours)
    .innerJoin(dailyReports, sql`${manhours.reportId} = ${dailyReports.id}`)
    .where(sql`${dailyReports.reportDate} >= '2026-01-01'`);

  console.log('📈 Null/Zero Check:');
  console.log(`   Total entries: ${nullCheck[0]?.count}`);
  console.log(`   hoursPobPheOses: null=${nullCheck[0]?.totalNullPhe}, zero=${nullCheck[0]?.totalZeroPhe}`);
  console.log(`   hoursPobContractor: null=${nullCheck[0]?.totalNullContractor}, zero=${nullCheck[0]?.totalZeroContractor}\n`);

  // Check distribution of hours values
  const distributionPhe = await db
    .select({
      hours: manhours.hoursPobPheOses,
      count: sql<number>`COUNT(*)`
    })
    .from(manhours)
    .innerJoin(dailyReports, sql`${manhours.reportId} = ${dailyReports.id}`)
    .where(sql`${dailyReports.reportDate} >= '2026-01-01' AND ${manhours.hoursPobPheOses} IS NOT NULL`)
    .groupBy(manhours.hoursPobPheOses)
    .orderBy(manhours.hoursPobPheOses);

  console.log('📊 hoursPobPheOses distribution:');
  distributionPhe.forEach(row => {
    console.log(`   ${row.hours} hours: ${row.count} entries`);
  });
  console.log('');

  const distributionContractor = await db
    .select({
      hours: manhours.hoursPobContractor,
      count: sql<number>`COUNT(*)`
    })
    .from(manhours)
    .innerJoin(dailyReports, sql`${manhours.reportId} = ${dailyReports.id}`)
    .where(sql`${dailyReports.reportDate} >= '2026-01-01' AND ${manhours.hoursPobContractor} IS NOT NULL`)
    .groupBy(manhours.hoursPobContractor)
    .orderBy(manhours.hoursPobContractor);

  console.log('📊 hoursPobContractor distribution:');
  distributionContractor.forEach(row => {
    console.log(`   ${row.hours} hours: ${row.count} entries`);
  });
  console.log('');

  console.log('=== CHECK COMPLETE ===');
}

// Run the check
checkHoursInReportManhours().catch(console.error);