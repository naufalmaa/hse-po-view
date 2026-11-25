import { pool } from '../index.ts';
import { ensureExtensionsAndTypes } from './01-extensions-and-types.ts';
import { ensureAuthCoreSchema } from './02-auth-core.ts';
import { ensureWorkLocationsAndReportSchema } from './03-work-locations-report.ts';
import { ensureEmployeeAttendanceSchema } from './04-employee-attendance.ts';
import { ensureLogManhoursSchema } from './05-log-manhours.ts';
import { ensureCsmsSchema } from './06-csms.ts';
import { ensureColumnRepairs } from './07-column-repairs.ts';
import { ensureUpdatedAtTriggers } from './08-updated-at-triggers.ts';

/**
 * Idempotent Database Auto-Ensure Orchestrator
 *
 * Automatically verifies and synchronizes all PostgreSQL tables, columns,
 * relations, enums, extensions, and unique indexes on server startup.
 *
 * - 100% Non-destructive: NEVER drops or truncates tables or columns.
 * - Idempotent: Can be executed safely any number of times.
 * - Bridges discrepancies between local development and production databases.
 */
export async function ensureDatabaseSchema(): Promise<void> {
  if (process.env.SKIP_DB_ENSURE === 'true' || process.env.AUTO_ENSURE_SCHEMA === 'false') {
    console.log('[DB Auto-Ensure] Skipping database schema synchronization (disabled via ENV).');
    return;
  }

  console.log('[DB Auto-Ensure] Checking & synchronizing database schema...');
  const startTime = Date.now();

  const client = await pool.connect();
  const ADVISORY_LOCK_ID = 746193; // 32-bit int to synchronize migration across instances
  let lockAcquired = false;

  try {
    // 0. Acquire PostgreSQL Advisory Lock to avoid concurrent DDL collision in PM2 cluster mode
    const lockRes = await client.query('SELECT pg_try_advisory_lock($1) AS acquired;', [ADVISORY_LOCK_ID]);
    lockAcquired = Boolean(lockRes.rows[0]?.acquired);

    if (!lockAcquired) {
      console.log('[DB Auto-Ensure] Another instance is currently synchronizing schema. Skipping on this process.');
      return;
    }

    // Set lock_timeout so DDL queries never hang indefinitely if another process holds locks
    await client.query(`SET lock_timeout = '15s';`);

    // 01. Extensions & Types (UUID, ltree, vector, UserRole, StatusContractEnum)
    const { hasVector } = await ensureExtensionsAndTypes(client);
    console.log('[DB Auto-Ensure] 01. Extensions and custom types verified.');

    // 02. Auth & Core Tables (users, accounts, sessions, vessels, sub_contractors, etc.)
    await ensureAuthCoreSchema(client);
    console.log('[DB Auto-Ensure] 02. Auth and core tables verified.');

    // 03. Report & Work Locations (subtypes, work_locations, daily_reports, report_* tables)
    await ensureWorkLocationsAndReportSchema(client);
    console.log('[DB Auto-Ensure] 03. Work locations and report schema verified.');

    // 04. Employee & Attendance (employees, attendance, employee_status, smart_cards, upload_*)
    await ensureEmployeeAttendanceSchema(client);
    console.log('[DB Auto-Ensure] 04. Employee and attendance schema verified.');

    // 05. Log Manhours (log_manhours table, work_location_id, and 3 partial unique indexes)
    await ensureLogManhoursSchema(client);
    console.log('[DB Auto-Ensure] 05. Log manhours and unique indexes verified.');

    // 06. CSMS Module (csms_* tables, contract folders, ai evaluation, etc.)
    await ensureCsmsSchema(client, { hasVector });
    console.log('[DB Auto-Ensure] 06. CSMS module schema verified.');

    // 07. Perbaikan nama kolom pada DB yang dibuat versi auto-ensure lama
    await ensureColumnRepairs(client);
    console.log('[DB Auto-Ensure] 07. Column name repairs verified.');

    // 08. Trigger updated_at (dulu dibuat manual di server)
    await ensureUpdatedAtTriggers(client);
    console.log('[DB Auto-Ensure] 08. updated_at triggers verified.');

    const duration = Date.now() - startTime;
    console.log(`[DB Auto-Ensure] Database schema synchronization complete in ${duration}ms.`);
  } catch (error) {
    console.error('[DB Auto-Ensure] Critical error during database schema synchronization:', error);
    // Rethrow to avoid starting app with broken/incomplete schema
    throw error;
  } finally {
    try {
      if (lockAcquired) {
        await client.query('SELECT pg_advisory_unlock($1);', [ADVISORY_LOCK_ID]);
      }
      await client.query(`RESET lock_timeout;`);
    } catch {}
    client.release();
  }
}
