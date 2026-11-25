import { pool } from '../db/index.ts';

async function main() {
  // 1. Check subtypes
  const subtypesRes = await pool.query(`SELECT id, name FROM subtypes WHERE name ILIKE '%storage%' OR name ILIKE '%tst%'`);
  console.log('--- SUBTYPES ---');
  console.table(subtypesRes.rows);

  // 2. Check distinct project_name in employees
  const distinctProjNames = await pool.query(`SELECT project_name, count(*) FROM employees GROUP BY project_name ORDER BY count DESC LIMIT 15`);
  console.log('--- DISTINCT EMPLOYEES.PROJECT_NAME ---');
  console.table(distinctProjNames.rows);

  // 3. Check employees with project_id in matching subtypes
  const empSubtypes = await pool.query(`
    SELECT e.id, e.employee_name, e.category, e.project_id, e.project_name, s.name as subtype_name, e.vessel_id
    FROM employees e
    LEFT JOIN subtypes s ON e.project_id = s.id
    WHERE s.name ILIKE '%storage%' OR s.name ILIKE '%tst%' OR e.project_name ILIKE '%storage%' OR e.project_name ILIKE '%tst%'
    LIMIT 20
  `);
  console.log('--- EMPLOYEES MATCHING STORAGE / TST ---');
  console.table(empSubtypes.rows);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
