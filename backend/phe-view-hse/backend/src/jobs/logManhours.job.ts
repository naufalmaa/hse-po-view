import { db } from '../db/index.ts';
import { logManhours } from '../db/schema/log-manhours.schema.ts';
import { asc, eq } from 'drizzle-orm';
import { collectAndSaveLogManhours, hasLogManhoursForDate, isIndonesiaWorkingDay } from '../services/daily-report/logManhours.service.ts';

/**
 * Format a Date object to YYYY-MM-DD
 */
function getFormattedDate(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(date);
}

/**
 * Check if log manhours for today already exists
 */
export async function hasTodayLogManhours(): Promise<boolean> {
  const today = getFormattedDate(new Date());
  return await hasLogManhoursForDate(today);
}

/**
 * Run the log manhours job
 */
export async function runLogManhoursJob() {
  console.log('[JOB] LogManhours: starting check...');

  const officeProjectId = '207f16d1-cbfa-43a1-bc3f-c7cbea400755';

  // 1. Get all unique log dates that exist in the database (for general gaps)
  const existingRows = await db
    .select({ logDate: logManhours.logDate })
    .from(logManhours);

  const allExistingDatesSet = new Set<string>();
  for (const row of existingRows) {
    if (row.logDate) {
      allExistingDatesSet.add(row.logDate);
    }
  }

  // 2. Get all log dates specifically containing the Office Team project
  const existingOfficeRows = await db
    .select({ logDate: logManhours.logDate })
    .from(logManhours)
    .where(eq(logManhours.projectId, officeProjectId));

  const existingOfficeDatesSet = new Set<string>();
  for (const row of existingOfficeRows) {
    if (row.logDate) {
      existingOfficeDatesSet.add(row.logDate);
    }
  }

  // 3. Find the oldest date in the database to start our search
  let startDate: Date;
  const oldestRow = await db
    .select({ logDate: logManhours.logDate })
    .from(logManhours)
    .orderBy(asc(logManhours.logDate))
    .limit(1);

  if (oldestRow.length > 0 && oldestRow[0].logDate) {
    const [year, month, day] = oldestRow[0].logDate.split('-').map(Number);
    startDate = new Date(year, month - 1, day);
  } else {
    // Fallback to 3 days ago if database has no records
    startDate = new Date();
    startDate.setDate(startDate.getDate() - 3);
  }

  const today = new Date();

  // Set time parts to 00:00:00 to compare dates safely
  startDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  // Cap backfill limit to past 30 days to avoid performance overhead
  const maxBackfillLimit = new Date();
  maxBackfillLimit.setDate(maxBackfillLimit.getDate() - 30);
  maxBackfillLimit.setHours(0, 0, 0, 0);

  if (startDate < maxBackfillLimit) {
    startDate = maxBackfillLimit;
  }

  const checkDate = new Date(startDate);
  let checkedCount = 0;
  let addedCount = 0;

  while (checkDate <= today) {
    const checkDateStr = getFormattedDate(checkDate);
    checkedCount++;

    const isWorkingDay = isIndonesiaWorkingDay(checkDate);
    const isOfficeMissing = isWorkingDay && !existingOfficeDatesSet.has(checkDateStr);
    const isDayEntirelyMissing = !allExistingDatesSet.has(checkDateStr);

    if (isOfficeMissing || isDayEntirelyMissing) {
      console.log(`[JOB] LogManhours: data tanggal (${checkDateStr}) perlu ditambahkan. isOfficeMissing: ${isOfficeMissing}, isDayEntirelyMissing: ${isDayEntirelyMissing}`);
      try {
        await collectAndSaveLogManhours(new Date(checkDate));
        addedCount++;

        // Add to our sets to prevent duplicate logs on the same checkDate in the loop
        allExistingDatesSet.add(checkDateStr);
        existingOfficeDatesSet.add(checkDateStr);
      } catch (err) {
      }
    } else {
    }
    checkDate.setDate(checkDate.getDate() + 1);
  }
}


