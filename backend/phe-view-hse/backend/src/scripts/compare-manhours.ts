import { db } from '../db/index.ts';
import { logManhours } from '../db/schema/log-manhours.schema.ts';
import { manhours, dailyReports, dailyReportSubtypes, subtypes } from '../db/schema/report.schema.ts';
import { eq, and, gte, lte } from 'drizzle-orm';
import env from '../config/env.config.ts';

/**
 * Compare log_manhours vs report_manhours data
 * Run this script to verify differences between the two data sources
 */

async function compareManhoursData() {
  console.log('=== COMPARING log_manhours vs report_manhours ===\n');

  // 1. Count total entries
  const logManhoursCount = await db
    .select({ count: logManhours.id })
    .from(logManhours);
  
  const reportManhoursCount = await db
    .select({ count: manhours.id })
    .from(manhours);

  console.log('📊 Entry Counts:');
  console.log(`   log_manhours: ${logManhoursCount.length} entries`);
  console.log(`   report_manhours: ${reportManhoursCount.length} entries\n`);

  // 2. Get date ranges
  const logDateRange = await db
    .select({ 
      minDate: logManhours.logDate,
      maxDate: logManhours.logDate 
    })
    .from(logManhours)
    .orderBy(logManhours.logDate)
    .limit(2);

  console.log('📅 Date Ranges:');
  console.log(`   log_manhours: ${logDateRange[0]?.minDate} to ${logDateRange[logDateRange.length - 1]?.maxDate}`);
  console.log(`   report_manhours: linked to daily_reports\n`);

  // 3. Compare totals for a specific date range (2026)
  const startDate = '2026-01-01';
  const endDate = '2026-12-31';

  console.log(`🔍 Comparing totals for ${startDate} to ${endDate}:\n`);

  // Get all log_manhours for 2026
  const logEntries2026 = await db
    .select()
    .from(logManhours)
    .where(and(
      gte(logManhours.logDate, startDate),
      lte(logManhours.logDate, endDate)
    ));

  console.log(`   log_manhours entries in 2026: ${logEntries2026.length}`);

  // Calculate log_manhours totals
  let logTotalPobPheOses = 0;
  let logTotalPobContractor = 0;
  let logTotalManhours = 0;
  let logTotalMandays = 0;

  // Cache subtype hours
  const subtypeCache = new Map<string, { hoursPobPheOses: number; hoursPobContractor: number }>();

  for (const entry of logEntries2026) {
    logTotalPobPheOses += entry.pobPheOses ?? 0;
    logTotalPobContractor += entry.pobContractor ?? 0;
    logTotalMandays += (entry.pobPheOses ?? 0) + (entry.pobContractor ?? 0);

    let hoursPobPheOses = 8;
    let hoursPobContractor = 12;

    if (entry.projectId) {
      if (!subtypeCache.has(entry.projectId)) {
        const [subtype] = await db
          .select({
            extra: subtypes.extra
          })
          .from(subtypes)
          .where(eq(subtypes.id, entry.projectId));
        
        if (subtype) {
          const extra = subtype.extra as { hoursPobPheOses?: number; hoursPobContractor?: number } | null;
          subtypeCache.set(entry.projectId, {
            hoursPobPheOses: extra?.hoursPobPheOses ?? 8,
            hoursPobContractor: extra?.hoursPobContractor ?? 12
          });
        } else {
          subtypeCache.set(entry.projectId, { hoursPobPheOses: 8, hoursPobContractor: 12 });
        }
      }
      
      const cached = subtypeCache.get(entry.projectId)!;
      hoursPobPheOses = cached.hoursPobPheOses;
      hoursPobContractor = cached.hoursPobContractor;
    } else if (entry.vesselId) {
      hoursPobPheOses = env.marine.hoursPobPheOses ?? 12;
      hoursPobContractor = env.marine.hoursPobContractor ?? 14;
    }

    logTotalManhours += ((entry.pobPheOses ?? 0) * hoursPobPheOses) + 
                        ((entry.pobContractor ?? 0) * hoursPobContractor);
  }

  console.log('   log_manhours totals:');
  console.log(`     - Total POB PHE OSES: ${logTotalPobPheOses}`);
  console.log(`     - Total POB Contractor: ${logTotalPobContractor}`);
  console.log(`     - Total Mandays: ${logTotalMandays}`);
  console.log(`     - Total Manhours: ${logTotalManhours}\n`);

  // Get all report_manhours for 2026
  const reportEntries2026 = await db
    .select({
      manhours: manhours,
      reportDate: dailyReports.reportDate,
      formType: dailyReports.formType
    })
    .from(manhours)
    .innerJoin(dailyReports, eq(manhours.reportId, dailyReports.id))
    .where(and(
      gte(dailyReports.reportDate, startDate),
      lte(dailyReports.reportDate, endDate)
    ));

  console.log(`   report_manhours entries in 2026: ${reportEntries2026.length}`);

  // Calculate report_manhours totals
  let reportTotalPobPheOses = 0;
  let reportTotalPobContractor = 0;
  let reportTotalManhours = 0;
  let reportTotalMandays = 0;

  for (const entry of reportEntries2026) {
    reportTotalPobPheOses += entry.manhours.pobPheOses ?? 0;
    reportTotalPobContractor += entry.manhours.pobContractor ?? 0;
    reportTotalMandays += (entry.manhours.pobPheOses ?? 0) + (entry.manhours.pobContractor ?? 0);

    const hoursPobPheOses = entry.manhours.hoursPobPheOses ?? 0;
    const hoursPobContractor = entry.manhours.hoursPobContractor ?? 0;

    reportTotalManhours += ((entry.manhours.pobPheOses ?? 0) * hoursPobPheOses) + 
                           ((entry.manhours.pobContractor ?? 0) * hoursPobContractor);
  }

  console.log('   report_manhours totals:');
  console.log(`     - Total POB PHE OSES: ${reportTotalPobPheOses}`);
  console.log(`     - Total POB Contractor: ${reportTotalPobContractor}`);
  console.log(`     - Total Mandays: ${reportTotalMandays}`);
  console.log(`     - Total Manhours: ${reportTotalManhours}\n`);

  // 4. Show differences
  console.log('📈 Differences (log_manhours - report_manhours):');
  console.log(`   - POB PHE OSES: ${logTotalPobPheOses - reportTotalPobPheOses}`);
  console.log(`   - POB Contractor: ${logTotalPobContractor - reportTotalPobContractor}`);
  console.log(`   - Mandays: ${logTotalMandays - reportTotalMandays}`);
  console.log(`   - Manhours: ${logTotalManhours - reportTotalManhours}\n`);

  // 5. Check for duplicate entries in log_manhours (same date + same project/vessel)
  console.log('🔎 Checking for duplicate log_manhours entries (same date + project/vessel):');
  
  const duplicates: Map<string, number> = new Map();
  for (const entry of logEntries2026) {
    const key = entry.projectId 
      ? `${entry.logDate}_project_${entry.projectId}`
      : entry.vesselId 
        ? `${entry.logDate}_vessel_${entry.vesselId}`
        : `${entry.logDate}_unknown`;
    
    duplicates.set(key, (duplicates.get(key) || 0) + 1);
  }

  const duplicateEntries = Array.from(duplicates.entries()).filter(([_, count]) => count > 1);
  console.log(`   Found ${duplicateEntries.length} duplicate combinations\n`);

  if (duplicateEntries.length > 0 && duplicateEntries.length <= 10) {
    console.log('   Sample duplicates:');
    duplicateEntries.slice(0, 10).forEach(([key, count]) => {
      console.log(`     - ${key}: ${count} entries`);
    });
    console.log('');
  }

  // 6. Check entries that exist in one table but not the other
  console.log('🔍 Cross-reference analysis:');
  
  // Get unique date+project combinations from log_manhours
  const logCombinations = new Set<string>();
  for (const entry of logEntries2026) {
    const key = entry.projectId 
      ? `${entry.logDate}_project_${entry.projectId}`
      : entry.vesselId 
        ? `${entry.logDate}_vessel_${entry.vesselId}`
        : '';
    if (key) logCombinations.add(key);
  }

  // Get unique date+project combinations from report_manhours
  const reportCombinations = new Set<string>();
  for (const entry of reportEntries2026) {
    // Need to get project/vessel from report
    const [subtypeRel] = await db
      .select({ subtypeId: dailyReportSubtypes.subtypeId })
      .from(dailyReportSubtypes)
      .where(eq(dailyReportSubtypes.reportId, entry.manhours.reportId));
    
    const key = subtypeRel?.subtypeId
      ? `${entry.reportDate}_project_${subtypeRel.subtypeId}`
      : `${entry.reportDate}_project_notype`;
    reportCombinations.add(key);
  }

  const onlyInLog = [...logCombinations].filter(c => !reportCombinations.has(c));
  const onlyInReport = [...reportCombinations].filter(c => !logCombinations.has(c));

  console.log(`   - Combinations only in log_manhours: ${onlyInLog.length}`);
  console.log(`   - Combinations only in report_manhours: ${onlyInReport.length}`);
  console.log(`   - Common combinations: ${logCombinations.size - onlyInLog.length}\n`);

  if (onlyInLog.length > 0 && onlyInLog.length <= 10) {
    console.log('   Sample only in log_manhours:');
    onlyInLog.slice(0, 10).forEach(c => console.log(`     - ${c}`));
    console.log('');
  }

  if (onlyInReport.length > 0 && onlyInReport.length <= 10) {
    console.log('   Sample only in report_manhours:');
    onlyInReport.slice(0, 10).forEach(c => console.log(`     - ${c}`));
    console.log('');
  }

  console.log('=== COMPARISON COMPLETE ===');
}

// Run the comparison
compareManhoursData().catch(console.error);
