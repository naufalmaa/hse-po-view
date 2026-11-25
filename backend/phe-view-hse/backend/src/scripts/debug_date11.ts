import { pool } from '../db/index.ts';

async function main() {
  const dateStr = '2026-09-11';
  const projectName = 'Temporary Storage Tank 2026';
  const locationName = 'AWB Amaris';

  console.log(`=== ANALYZING ${projectName} at ${locationName} on ${dateStr} ===`);

  // 1. Get Project ID
  const projRes = await pool.query('SELECT id, name FROM subtypes WHERE name = $1', [projectName]);
  const project = projRes.rows[0];
  console.log('Project:', project);
  if (!project) {
    console.log('Project not found!');
    process.exit(1);
  }

  // 2. Get Work Location ID
  const locRes = await pool.query('SELECT id, name, project_id FROM work_locations WHERE project_id = $1 AND name = $2', [project.id, locationName]);
  const workLoc = locRes.rows[0];
  console.log('Work Location:', workLoc);

  // 3. Get Daily Reports on 2026-09-11 for this project
  const repRes = await pool.query(`
    SELECT dr.id, dr.report_date, dr.reported_by, dr.work_location_id, wl.name as work_location_name, drs.subtype_id
    FROM daily_reports dr
    LEFT JOIN daily_report_subtypes drs ON dr.id = drs.report_id
    LEFT JOIN work_locations wl ON dr.work_location_id = wl.id
    WHERE dr.report_date = $1 AND drs.subtype_id = $2
  `, [dateStr, project.id]);
  console.log('\nDaily Reports found on 2026-09-11 for this project:', repRes.rows);

  // 4. Get Log Manhours for this project on 2026-09-11
  const logRes = await pool.query(`
    SELECT lm.*, wl.name as work_location_name
    FROM log_manhours lm
    LEFT JOIN work_locations wl ON lm.work_location_id = wl.id
    WHERE lm.log_date = $1 AND lm.project_id = $2
  `, [dateStr, project.id]);
  console.log('\nLog Manhours rows for this project on 2026-09-11:', logRes.rows);

  // 5. Query attendance status of employees belonging to this project on 2026-09-11
  // An employee is on-duty on 2026-09-11 if their latest attendance record on or before 2026-09-11 had status_after = 'on_duty'
  const attRes = await pool.query(`
    WITH latest_att AS (
      SELECT DISTINCT ON (employee_id) 
        id, employee_id, attendance_date, status_after, work_location_id, position, created_at
      FROM attendance
      WHERE attendance_date <= $1
      ORDER BY employee_id, attendance_date DESC, created_at DESC
    )
    SELECT 
      e.id as emp_id, e.employee_name, e.category, e.location, e.status_on_duty,
      la.attendance_date as last_att_date,
      la.status_after as last_status,
      la.work_location_id as att_work_loc_id,
      wl.name as att_work_loc_name
    FROM employees e
    LEFT JOIN latest_att la ON e.id = la.employee_id
    LEFT JOIN work_locations wl ON la.work_location_id = wl.id
    WHERE e.project_id = $2
    ORDER BY e.employee_name
  `, [dateStr, project.id]);

  console.log(`\nTotal employees in project ${projectName}: ${attRes.rows.length}`);

  const onDutyEmployees = attRes.rows.filter(r => r.last_status === 'on_duty');
  console.log(`Employees on duty on or before ${dateStr}: ${onDutyEmployees.length}`);

  const onDutyAmaris = onDutyEmployees.filter(r => 
    r.att_work_loc_id === workLoc?.id || 
    (r.location && r.location.trim().toLowerCase() === locationName.toLowerCase())
  );
  console.log(`Employees on duty for ${locationName}: ${onDutyAmaris.length}`);
  console.log('Sample on duty for Amaris:', onDutyAmaris.slice(0, 5));

  const onDutyOther = onDutyEmployees.filter(r => 
    r.att_work_loc_id !== workLoc?.id && 
    (!r.location || r.location.trim().toLowerCase() !== locationName.toLowerCase())
  );
  console.log(`Employees on duty for Other Locations: ${onDutyOther.length}`);
  if (onDutyOther.length > 0) {
    console.log('Sample other:', onDutyOther.slice(0, 5));
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
