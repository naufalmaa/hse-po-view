import { db } from '../db/index.ts';
import {dailyReports, laggingIndicators} from '../db/schema/report.schema.ts';
import { logManhours } from '../db/schema/log-manhours.schema.ts';
import { eq, sql, inArray, and, gte, lte } from 'drizzle-orm';
import { startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import path from 'path';

// Upload Helper Functions
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_.]/g, '_');
}

export function getTimestampFilename(originalName: string): string {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const baseName = sanitizeFilename(path.basename(originalName, path.extname(originalName)));
  const ext = path.extname(originalName).toLowerCase();
  return `${timestamp}-${baseName}${ext}`;
}

export type SummaryResult = {
  day: number;
  monthly: number;
  ytd: number;
};

export function calculateSumFromKeys(
  item: Record<string, number | null | undefined>,
  keys: string[]
): number {
  return keys.reduce((sum, key) => sum + (item[key] ?? 0), 0);
}

export function calculateCustomManhours(
  item: Record<string, number | null | undefined>
): number {
  const phe = (item.pobPheOses ?? 0) * (item.hoursPobPheOses ?? 0);
  const contractor = (item.pobContractor ?? 0) * (item.hoursPobContractor ?? 0);
  return phe + contractor;
}

interface GetSummaryByIdsOptions {
  mode?: 'normal' | 'customManhours';
}

export async function getSummaryByReportIds(
  table: any,
  keys: string[],
  reportIds: string[],       // Pre-filtered reportIds for the date range
  dayReportIds: string[],    // Untuk Today
  options?: GetSummaryByIdsOptions
): Promise<SummaryResult> {
  const mode = options?.mode ?? 'normal';

  const hasReportIds = Array.isArray(reportIds) && reportIds.length > 0;
  const hasDayIds = Array.isArray(dayReportIds) && dayReportIds.length > 0;

  if (!hasReportIds && !hasDayIds) {
    return { day: 0, monthly: 0, ytd: 0 };
  }

  const selectKeys = Object.fromEntries(
    keys.map(k => [k, table[k]]).filter(([, value]) => value !== undefined)
  ) as any;

  const process = (rows: any[]) =>
    rows.reduce(
      (sum, item) =>
        mode === 'customManhours'
          ? sum + calculateCustomManhours(item)
          : sum + calculateSumFromKeys(item, keys),
      0
    );

  // TODAY
  let today = 0;
  if (hasDayIds) {
    const todayRaw = await db
      .select(selectKeys)
      .from(table)
      .where(inArray(table.reportId, dayReportIds));
    today = process(todayRaw);
  }

  // ALL (Monthly & YTD across filtered reportIds)
  let all = 0;
  if (hasReportIds) {
    const allRaw = await db
      .select(selectKeys)
      .from(table)
      .where(inArray(table.reportId, reportIds));
    all = process(allRaw);
  }

  return { day: today, monthly: all, ytd: all };
}

/**
 * Calculate sum of all values for specified fields across filtered reportIds
 * This is specifically for free days calculations where we need total sum
 */
export async function calculateSumByReportIds(
  table: any,
  keys: string[],
  reportIds: string[]
): Promise<number> {
  if (!reportIds || reportIds.length === 0) {
    return 0;
  }

  const selectKeys = Object.fromEntries(keys.map(k => [k, table[k]]).filter(([,value]) => value !== undefined)) as any;

  const rows = await db
    .select(selectKeys)
    .from(table)
    .where(inArray(table.reportId, reportIds));

  return rows.reduce((sum, item) => sum + calculateSumFromKeys(item, keys), 0);
}

/**
 * Calculate consecutive free days with pre-filtered reportIds
 * This version doesn't apply additional date filtering since reportIds are already filtered
 * Logic: If value > 0, add value to consecutive count. If value = 0, reset counter to 0.
 */
export async function calculateConsecutiveFreeDaysFiltered(
  reportIds: string[],
  dayReportIds: string[],
  field: 'freeLtaDays' | 'freeRiDays'
): Promise<{ day: number; ytd: number }> {
  if (!reportIds || reportIds.length === 0) {
    return { day: 0, ytd: 0 };
  }

  // Get reference date from the latest report
  const [ref] = await db
    .select({ date: dailyReports.reportDate })
    .from(dailyReports)
    .where(eq(dailyReports.id, dayReportIds[0]));

  const refDate = ref?.date ? new Date(ref.date) : null;
  if (!refDate) return { day: 0, ytd: 0 };

  // Get data for the already filtered reportIds only
  const ytdData = await db
    .select({
      reportDate: dailyReports.reportDate,
      [field]: field === 'freeLtaDays' ? laggingIndicators.freeLtaDays : laggingIndicators.freeRiDays
    })
    .from(dailyReports)
    .innerJoin(laggingIndicators, eq(dailyReports.id, laggingIndicators.reportId))
    .where(inArray(dailyReports.id, reportIds))
    .orderBy(sql`daily_reports.report_date ASC`);

  let consecutiveDays = 0;
  let currentStreak = 0;

  // Process chronologically
  for (const record of ytdData) {
    const value = record[field] as number;
    
    if (value > 0) {
      // If value is greater than 0, add it to consecutive count
      consecutiveDays += value;
    } else if (value === 0) {
      // If value is 0, reset the counter
      consecutiveDays = 0;
    }
    // If value is null/undefined, maintain current count
    
    // Always update current streak to the latest consecutive count
    currentStreak = consecutiveDays;
  }

  // For consecutive days calculation, both day and ytd should return the current streak
  return {
    day: currentStreak,
    ytd: currentStreak
  };
}

/**
 * Calculate consecutive free days (for freeLtaDays and freeRiDays)
 * Logic: If value > 0, add value to consecutive count. If value = 0, reset counter to 0.
 */
export async function calculateConsecutiveFreeDays(
  reportIds: string[],
  dayReportIds: string[],
  field: 'freeLtaDays' | 'freeRiDays',
  basis: 'default' | 'range' | 'all' = 'default'
): Promise<{ day: number; ytd: number }> {
  if (!reportIds || reportIds.length === 0) {
    return { day: 0, ytd: 0 };
  }

  // Get reference date from the latest report
  const [ref] = await db
    .select({ date: dailyReports.reportDate })
    .from(dailyReports)
    .where(eq(dailyReports.id, dayReportIds[0]));

  const refDate = ref?.date ? new Date(ref.date) : null;
  if (!refDate) return { day: 0, ytd: 0 };

  let startDate: Date;
  if (basis === 'all') {
    startDate = new Date('1900-01-01'); // Very old date to capture all data
  } else {
    startDate = startOfYear(refDate);
  }

  // Get all data ordered by date (based on basis)
  const ytdData = await db
    .select({
      reportDate: dailyReports.reportDate,
      [field]: field === 'freeLtaDays' ? laggingIndicators.freeLtaDays : laggingIndicators.freeRiDays
    })
    .from(dailyReports)
    .innerJoin(laggingIndicators, eq(dailyReports.id, laggingIndicators.reportId))
    .where(sql`daily_reports.report_date BETWEEN ${startDate} AND ${ref.date}`)
    .orderBy(sql`daily_reports.report_date ASC`);

  let consecutiveDays = 0;
  let currentDay = 0;

  // Process chronologically
  for (const record of ytdData) {
    const value = record[field] as number;
    
    if (value > 0) {
      // If value is greater than 0, add it to consecutive count
      consecutiveDays += value;
    } else if (value === 0) {
      // If value is 0, reset the counter
      consecutiveDays = 0;
    }
    // If value is null/undefined, maintain current count
    
    // If this is today's record, capture the current day value
    if (record.reportDate === ref.date) {
      currentDay = consecutiveDays;
    }
  }

  return {
    day: currentDay,
    ytd: consecutiveDays
  };
}

export async function getSummary(
  table: any,
  keys: string[],
  reportId: string,
  options?: { mode?: 'normal' | 'customManhours' }
): Promise<SummaryResult> {
  const mode = options?.mode ?? 'normal';

  const [report] = await db
    .select({ date: dailyReports.reportDate })
    .from(dailyReports)
    .where(eq(dailyReports.id, reportId));

  const todayDate = report?.date;
  if (!todayDate) return { day: 0, monthly: 0, ytd: 0 };

  const reportDate = new Date(todayDate);
  const startMonth = startOfMonth(reportDate);
  const endMonth = endOfMonth(reportDate);
  const startYear = startOfYear(reportDate);

  const selectKeys = Object.fromEntries(keys.map(k => [k, table[k]]).filter(([,value]) => value !== undefined)) as any;

  const process = (rows: any[]) =>
    rows.reduce((sum, item) =>
      mode === 'customManhours'
        ? sum + calculateCustomManhours(item)
        : sum + calculateSumFromKeys(item, keys), 0);

  // TODAY
  const todayRaw = await db
    .select(selectKeys)
    .from(table)
    .where(eq(table.reportId, reportId));
  const today = process(todayRaw);

  // MONTHLY
  const monthlyRaw = await db
    .select(selectKeys)
    .from(table)
    .innerJoin(dailyReports, eq(table.reportId, dailyReports.id))
    .where(sql`daily_reports.report_date BETWEEN ${startMonth} AND ${endMonth}`);
  const monthly = process(monthlyRaw);

  // YTD
  const ytdRaw = await db
    .select(selectKeys)
    .from(table)
    .innerJoin(dailyReports, eq(table.reportId, dailyReports.id))
    .where(sql`daily_reports.report_date BETWEEN ${startYear} AND ${todayDate}`);
  const ytd = process(ytdRaw);

  return { day: today, monthly, ytd };
}

/**
 * Calculate manhours summary from log_manhours table
 * Uses logDate, projectId (for project), or vesselId (for marine) instead of reportId
 */
export async function getManhoursSummaryFromLog(
  reportId: string,
  formType: 'project' | 'marine',
  hoursPobPheOses: number,
  hoursPobContractor: number,
  projectId?: string,
  vesselId?: string,
  workLocationId?: string | null
): Promise<{
  todayMandays: number;
  monthlyMandays: number;
  ytdMandays: number;
  todayManhours: number;
  monthlyManhours: number;
  ytdManhours: number;
}> {
  // Get the report date
  const [report] = await db
    .select({ date: dailyReports.reportDate })
    .from(dailyReports)
    .where(eq(dailyReports.id, reportId));

  const reportDate = report?.date ? new Date(report.date) : null;
  if (!reportDate) {
    return {
      todayMandays: 0,
      monthlyMandays: 0,
      ytdMandays: 0,
      todayManhours: 0,
      monthlyManhours: 0,
      ytdManhours: 0
    };
  }

  const todayDate = reportDate.toISOString().split('T')[0];
  const startMonth = startOfMonth(reportDate);
  const endMonth = endOfMonth(reportDate);
  const startYear = startOfYear(reportDate);

  // Build conditions based on formType
  const buildConditions = (dateCondition: any) => {
    const conditions = [dateCondition];
    
    if (formType === 'project' && projectId) {
      conditions.push(eq(logManhours.projectId, projectId));
      if (workLocationId !== undefined) {
        if (workLocationId) {
          conditions.push(eq(logManhours.workLocationId, workLocationId));
        } else {
          conditions.push(sql`${logManhours.workLocationId} IS NULL`);
        }
      }
    } else if (formType === 'marine' && vesselId) {
      conditions.push(eq(logManhours.vesselId, vesselId));
    }
    
    return and(...conditions);
  };

  // TODAY
  const todayData = await db
    .select({
      pobPheOses: logManhours.pobPheOses,
      pobContractor: logManhours.pobContractor
    })
    .from(logManhours)
    .where(buildConditions(eq(logManhours.logDate, todayDate)));

  const todayMandays = todayData.reduce((sum, item) => 
    sum + (item.pobPheOses ?? 0) + (item.pobContractor ?? 0), 0);
  
  const todayManhours = todayData.reduce((sum, item) => {
    const phe = (item.pobPheOses ?? 0) * hoursPobPheOses;
    const contractor = (item.pobContractor ?? 0) * hoursPobContractor;
    return sum + phe + contractor;
  }, 0);

  // MONTHLY
  const monthlyData = await db
    .select({
      pobPheOses: logManhours.pobPheOses,
      pobContractor: logManhours.pobContractor
    })
    .from(logManhours)
    .where(buildConditions(
      and(
        gte(logManhours.logDate, startMonth.toISOString().split('T')[0]),
        lte(logManhours.logDate, endMonth.toISOString().split('T')[0])
      )
    ));

  const monthlyMandays = monthlyData.reduce((sum, item) => 
    sum + (item.pobPheOses ?? 0) + (item.pobContractor ?? 0), 0);
  
  const monthlyManhours = monthlyData.reduce((sum, item) => {
    const phe = (item.pobPheOses ?? 0) * hoursPobPheOses;
    const contractor = (item.pobContractor ?? 0) * hoursPobContractor;
    return sum + phe + contractor;
  }, 0);

  // YTD
  const ytdData = await db
    .select({
      pobPheOses: logManhours.pobPheOses,
      pobContractor: logManhours.pobContractor
    })
    .from(logManhours)
    .where(buildConditions(
      and(
        gte(logManhours.logDate, startYear.toISOString().split('T')[0]),
        lte(logManhours.logDate, todayDate)
      )
    ));

  const ytdMandays = ytdData.reduce((sum, item) => 
    sum + (item.pobPheOses ?? 0) + (item.pobContractor ?? 0), 0);
  
  const ytdManhours = ytdData.reduce((sum, item) => {
    const phe = (item.pobPheOses ?? 0) * hoursPobPheOses;
    const contractor = (item.pobContractor ?? 0) * hoursPobContractor;
    return sum + phe + contractor;
  }, 0);

  return {
    todayMandays,
    monthlyMandays,
    ytdMandays,
    todayManhours,
    monthlyManhours,
    ytdManhours
  };
}