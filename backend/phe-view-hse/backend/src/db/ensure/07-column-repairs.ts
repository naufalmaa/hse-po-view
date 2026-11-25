import type { PoolClient } from 'pg';

/**
 * Memperbaiki nama kolom pada database yang dibuat oleh versi auto-ensure lama.
 * Versi lama membuat `description` / `errormessage`, padahal Drizzle schema memakai nama di bawah.
 * Aman diulang: hanya mengganti nama bila kolom lama ada dan kolom baru belum ada.
 */
const RENAMES: Array<[table: string, from: string, to: string]> = [
  ['report_meetings', 'description', 'meeting_description'],
  ['report_drills', 'description', 'drill_description'],
  ['report_trainings', 'description', 'training_description'],
  ['report_smart_cards', 'description', 'kartu_pintar_description'],
  ['report_permits', 'description', 'permit_to_work_description'],
  ['upload_history', 'errormessage', 'error_message'],
];

export async function ensureColumnRepairs(client: PoolClient): Promise<void> {
  for (const [table, from, to] of RENAMES) {
    const { rows } = await client.query<{ col: string }>(
      `SELECT column_name AS col FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1 AND column_name = ANY($2::text[])`,
      [table, [from, to]],
    );
    const cols = new Set(rows.map((r) => r.col));
    if (cols.has(from) && !cols.has(to)) {
      await client.query(`ALTER TABLE ${table} RENAME COLUMN ${from} TO ${to};`);
      console.log(`[DB Auto-Ensure] ${table}.${from} -> ${to}`);
    } else if (!cols.has(to)) {
      await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${to} TEXT;`);
    }
  }
}
