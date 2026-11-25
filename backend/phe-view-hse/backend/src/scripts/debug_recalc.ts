import { recalculateLogManhoursForDate } from '../services/daily-report/logManhoursTrigger.service.ts';
import { pool } from '../db/index.ts';

function formatDateString(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') {
    return val.split('T')[0];
  }
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(val).slice(0, 10);
}

async function main() {
  const customDateArg = process.argv[2];

  // 1. Single Date Mode: If user explicitly passed a date (e.g. bun debug_recalc.js 2026-09-15)
  if (customDateArg && /^\d{4}-\d{2}-\d{2}$/.test(customDateArg.trim())) {
    const targetDate = customDateArg.trim();
    console.log(`[Single Date Mode] Recalculating POB for date: ${targetDate}...`);
    await recalculateLogManhoursForDate(targetDate);

    const res = await pool.query(
      `
      SELECT lm.log_date, wl.name as work_location_name, lm.pob_phe_oses, lm.pob_contractor,
             (COALESCE(lm.pob_phe_oses, 0) + COALESCE(lm.pob_contractor, 0)) as pob_total
      FROM log_manhours lm 
      LEFT JOIN work_locations wl ON lm.work_location_id = wl.id 
      WHERE lm.log_date = $1
      ORDER BY wl.name ASC;
    `,
      [targetDate]
    );

    console.log(`Resulting log_manhours for ${targetDate}:`);
    console.table(res.rows);
    await pool.end();
    process.exit(0);
  }

  // 2. Batch Mode: Automatically find project 'Temporary Storage Tank 2026'
  console.log('Searching for project "Temporary Storage Tank 2026"...');
  const projectRes = await pool.query(`
    SELECT id, name 
    FROM subtypes 
    WHERE name ILIKE '%Temporary Storage Tank 2026%' 
    LIMIT 1;
  `);

  if (projectRes.rows.length === 0) {
    console.error('❌ Project "Temporary Storage Tank 2026" not found in subtypes table!');
    await pool.end();
    process.exit(1);
  }

  const project = projectRes.rows[0];
  console.log(`✅ Found Project: ${project.name} (ID: ${project.id})`);

  // 3. Query all distinct report dates for this project
  const datesRes = await pool.query(
    `
    SELECT DISTINCT dr.report_date 
    FROM daily_reports dr
    JOIN daily_report_subtypes drs ON dr.id = drs.report_id
    WHERE drs.subtype_id = $1 
      AND dr.report_date IS NOT NULL
    ORDER BY dr.report_date ASC;
  `,
    [project.id]
  );

  const reportDates = datesRes.rows
    .map((r: any) => formatDateString(r.report_date))
    .filter((d: string) => d.length === 10);

  // Also query any attendance dates associated with this project in the project's date window
  let allTargetDates = reportDates;
  if (reportDates.length > 0) {
    const minDate = reportDates[0];
    const maxDate = reportDates[reportDates.length - 1];

    const attDatesRes = await pool.query(
      `
      SELECT DISTINCT a.attendance_date 
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      WHERE (e.project_id = $1 OR e.category = 'mitra')
        AND a.attendance_date >= $2
        AND a.attendance_date <= $3
      ORDER BY a.attendance_date ASC;
    `,
      [project.id, minDate, maxDate]
    );

    const attDates = attDatesRes.rows
      .map((r: any) => formatDateString(r.attendance_date))
      .filter((d: string) => d.length === 10);

    allTargetDates = Array.from(new Set([...reportDates, ...attDates])).sort();
  }

  if (allTargetDates.length === 0) {
    console.log('No report or attendance dates found for this project.');
    await pool.end();
    process.exit(0);
  }

  console.log(`Found ${allTargetDates.length} distinct dates to recalculate (from ${allTargetDates[0]} to ${allTargetDates[allTargetDates.length - 1]}).\n`);

  let successCount = 0;
  for (let i = 0; i < allTargetDates.length; i++) {
    const dateStr = allTargetDates[i];
    process.stdout.write(`[${i + 1}/${allTargetDates.length}] Recalculating POB for date: ${dateStr}... `);
    try {
      await recalculateLogManhoursForDate(dateStr);
      process.stdout.write('✓ OK\n');
      successCount++;
    } catch (err: any) {
      process.stdout.write(`❌ ERROR: ${err?.message || err}\n`);
    }
  }

  console.log(`\n🎉 Completed recalculation for ${successCount}/${allTargetDates.length} dates!`);

  // Print summary of latest records in log_manhours for this project
  const summaryRes = await pool.query(
    `
    SELECT lm.log_date, wl.name as work_location_name, lm.pob_phe_oses, lm.pob_contractor,
           (COALESCE(lm.pob_phe_oses, 0) + COALESCE(lm.pob_contractor, 0)) as pob_total
    FROM log_manhours lm
    LEFT JOIN work_locations wl ON lm.work_location_id = wl.id
    WHERE lm.project_id = $1
    ORDER BY lm.log_date DESC, wl.name ASC
    LIMIT 20;
  `,
    [project.id]
  );

  console.log('\nLatest updated log_manhours records:');
  console.table(summaryRes.rows);

  await pool.end();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Fatal error during recalculation:', err);
  try {
    await pool.end();
  } catch {}
  process.exit(1);
});
