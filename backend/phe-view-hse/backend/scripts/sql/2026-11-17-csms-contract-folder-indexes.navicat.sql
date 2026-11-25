-- NAVICAT / GUI VARIANT of 2026-11-17-csms-contract-folder-indexes.sql
-- Same indexes and names, but without CONCURRENTLY, so it also works when the client runs the whole
-- script in one transaction (CREATE INDEX CONCURRENTLY fails there with
-- "cannot run inside a transaction block").
-- Trade-off: while each index is built, INSERT/UPDATE/DELETE on csms_contract_folder wait (reads keep working).
-- On ~150k rows that is a few seconds; run it at a quiet moment.
--
-- Idempotent: safe to run any number of times.

DO $$
DECLARE
  spec text[];
  specs text[][] := ARRAY[
    ['csms_contract_folder_parent_id_idx',   'CREATE INDEX IF NOT EXISTS csms_contract_folder_parent_id_idx ON csms_contract_folder (parent_id)'],
    ['csms_contract_folder_contract_id_idx', 'CREATE INDEX IF NOT EXISTS csms_contract_folder_contract_id_idx ON csms_contract_folder (contract_id)'],
    ['csms_contract_folder_path_gist_idx',   'CREATE INDEX IF NOT EXISTS csms_contract_folder_path_gist_idx ON csms_contract_folder USING gist (path)']
  ];
BEGIN
  FOREACH spec SLICE 1 IN ARRAY specs LOOP
    -- an INVALID index (interrupted CONCURRENTLY build) would make IF NOT EXISTS skip it forever
    IF EXISTS (SELECT 1 FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
               WHERE c.relname = spec[1] AND NOT i.indisvalid) THEN
      RAISE NOTICE 'dropping invalid index %', spec[1];
      EXECUTE format('DROP INDEX %I', spec[1]);
    END IF;
    EXECUTE spec[2];
  END LOOP;
  ANALYZE csms_contract_folder;
END $$;

-- Check: three rows, valid = true
SELECT c.relname AS index_name, i.indisvalid AS valid, pg_size_pretty(pg_relation_size(c.oid)) AS size
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
WHERE i.indrelid = 'csms_contract_folder'::regclass
  AND c.relname IN ('csms_contract_folder_parent_id_idx', 'csms_contract_folder_contract_id_idx', 'csms_contract_folder_path_gist_idx')
ORDER BY c.relname;
