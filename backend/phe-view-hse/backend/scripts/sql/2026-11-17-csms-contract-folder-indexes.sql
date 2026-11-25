-- Indexes for csms_contract_folder (the table only had its primary key).
-- Without them every ON DELETE CASCADE check on parent_id, every children lookup and every
-- per-contract load is a full table scan (copy PB: deleting 300 rows took 8 s on 150k rows).
--
-- Idempotent: safe to run any number of times. Builds CONCURRENTLY, so the table stays writable.
-- Run it OUTSIDE a transaction (CREATE INDEX CONCURRENTLY cannot run inside BEGIN/COMMIT):
--   psql "postgresql://USER@HOST:5432/DBNAME" -v ON_ERROR_STOP=1 -f 2026-11-17-csms-contract-folder-indexes.sql
-- (do not use psql --single-transaction / -1, and in a GUI client run it with autocommit on)
--
-- The backend creates the same indexes at boot (src/db/ensure/06-csms.ts, plain CREATE INDEX IF NOT EXISTS);
-- after this script has run, that step is a no-op.

-- 1. An interrupted CONCURRENTLY build leaves an INVALID index that IF NOT EXISTS would then skip forever: drop it first.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_index i
    JOIN pg_class c ON c.oid = i.indexrelid
    WHERE i.indrelid = 'csms_contract_folder'::regclass
      AND NOT i.indisvalid
      AND c.relname IN ('csms_contract_folder_parent_id_idx', 'csms_contract_folder_contract_id_idx', 'csms_contract_folder_path_gist_idx')
  LOOP
    RAISE NOTICE 'dropping invalid index %', r.relname;
    EXECUTE format('DROP INDEX %I', r.relname);
  END LOOP;
END $$;

-- 2. The indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS csms_contract_folder_parent_id_idx ON csms_contract_folder (parent_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS csms_contract_folder_contract_id_idx ON csms_contract_folder (contract_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS csms_contract_folder_path_gist_idx ON csms_contract_folder USING gist (path);

-- 3. Fresh statistics so the planner uses them right away
ANALYZE csms_contract_folder;

-- 4. Check: three rows, valid = true
SELECT c.relname AS index_name, i.indisvalid AS valid, pg_size_pretty(pg_relation_size(c.oid)) AS size
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
WHERE i.indrelid = 'csms_contract_folder'::regclass
  AND c.relname LIKE 'csms_contract_folder_%_idx'
ORDER BY c.relname;
