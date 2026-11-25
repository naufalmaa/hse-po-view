import type pg from 'pg';

export async function ensureLogManhoursSchema(client: pg.PoolClient | pg.Pool): Promise<void> {
  // 1. log_manhours table
  await client.query(`
    CREATE TABLE IF NOT EXISTS log_manhours (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      log_date DATE NOT NULL,
      contractor_id UUID REFERENCES sub_contractors(id),
      project_id UUID REFERENCES subtypes(id),
      work_location_id UUID REFERENCES work_locations(id) ON DELETE CASCADE,
      vessel_id UUID REFERENCES vessels(id),
      pob_phe_oses INTEGER DEFAULT 0,
      pob_contractor INTEGER DEFAULT 0,
      is_legacy BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // 2. Ensure work_location_id column exists
  const cols = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'log_manhours';
  `);
  const colSet = new Set(cols.rows.map((r: any) => r.column_name));
  if (!colSet.has('work_location_id')) {
    await client.query(`
      ALTER TABLE log_manhours ADD COLUMN work_location_id UUID REFERENCES work_locations(id) ON DELETE CASCADE;
    `);
  }

  // 3. Check if unique indexes already exist and have correct definitions
  const idxRes = await client.query(`
    SELECT indexname, indexdef FROM pg_indexes 
    WHERE tablename = 'log_manhours' 
      AND indexname IN ('vessel_date_unique', 'project_date_unique', 'project_date_work_location_unique');
  `);
  const existingIdxMap = new Map<string, string>(idxRes.rows.map((r: any) => [r.indexname, r.indexdef]));

  // If project_date_unique exists but lacks "work_location_id IS NULL", it is the legacy definition that conflicts with work location logs
  const projectDateDef = existingIdxMap.get('project_date_unique') || '';
  if (existingIdxMap.has('project_date_unique') && !projectDateDef.includes('work_location_id IS NULL')) {
    await client.query(`DROP INDEX IF EXISTS project_date_unique;`);
    existingIdxMap.delete('project_date_unique');
  }

  if (!existingIdxMap.has('vessel_date_unique') || !existingIdxMap.has('project_date_unique') || !existingIdxMap.has('project_date_work_location_unique')) {
    await client.query(`
      DO $$ 
      BEGIN 
        -- A. vessel-based logs (when not legacy)
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'vessel_date_unique') THEN
          DELETE FROM log_manhours a USING log_manhours b
          WHERE a.id < b.id
            AND a.is_legacy = false AND b.is_legacy = false
            AND a.log_date = b.log_date
            AND a.vessel_id IS NOT NULL AND a.vessel_id = b.vessel_id;

          BEGIN
            CREATE UNIQUE INDEX vessel_date_unique 
              ON log_manhours (log_date, vessel_id) 
              WHERE is_legacy = false;
          EXCEPTION WHEN others THEN NULL;
          END;
        END IF;

        -- B. project-based logs without work location (whole project)
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'project_date_unique') THEN
          DELETE FROM log_manhours a USING log_manhours b
          WHERE a.id < b.id
            AND a.is_legacy = false AND b.is_legacy = false
            AND a.log_date = b.log_date
            AND a.project_id IS NOT NULL AND a.project_id = b.project_id
            AND a.work_location_id IS NULL AND b.work_location_id IS NULL;

          BEGIN
            CREATE UNIQUE INDEX project_date_unique 
              ON log_manhours (log_date, project_id) 
              WHERE is_legacy = false AND work_location_id IS NULL;
          EXCEPTION WHEN others THEN NULL;
          END;
        END IF;

        -- C. project-based logs with work location (specific work location)
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'project_date_work_location_unique') THEN
          DELETE FROM log_manhours a USING log_manhours b
          WHERE a.id < b.id
            AND a.is_legacy = false AND b.is_legacy = false
            AND a.log_date = b.log_date
            AND a.project_id IS NOT NULL AND a.project_id = b.project_id
            AND a.work_location_id IS NOT NULL AND a.work_location_id = b.work_location_id;

          BEGIN
            CREATE UNIQUE INDEX project_date_work_location_unique 
              ON log_manhours (log_date, project_id, work_location_id) 
              WHERE is_legacy = false AND work_location_id IS NOT NULL;
          EXCEPTION WHEN others THEN NULL;
          END;
        END IF;
      END $$;
    `);
  }
}
