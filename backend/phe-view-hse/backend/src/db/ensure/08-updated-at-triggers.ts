import type { PoolClient } from 'pg';

/**
 * Trigger `updated_at` otomatis. Di server lama trigger ini dibuat manual, sehingga instalasi baru
 * tidak memilikinya. Idempoten: fungsi di-REPLACE, trigger hanya dibuat bila belum ada.
 */
const TABLES: Array<[table: string, trigger: string]> = [
  ['employees', 'set_employees_updated_at'],
  ['log_manhours', 'set_log_manhours_updated_at'],
  ['report_files', 'set_updated_at'],
];

export async function ensureUpdatedAtTriggers(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE OR REPLACE FUNCTION public.update_updated_at_column()
     RETURNS trigger
     LANGUAGE plpgsql
    AS $function$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $function$;
  `);
  for (const [table, trigger] of TABLES) {
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
           WHERE c.relname = '${table}' AND t.tgname = '${trigger}' AND NOT t.tgisinternal
        ) THEN
          CREATE TRIGGER ${trigger} BEFORE UPDATE ON public.${table}
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END $$;
    `);
  }
}
