-- Indexes on the foreign keys that point to csms_contract_folder / csms_contract.
-- Without them, every deleted folder/file (and every deleted contract) makes PostgreSQL scan each of these
-- tables for the ON DELETE CASCADE check, and lookups by folder (approval history, AI results) are full scans.
--
-- Idempotent: safe to run any number of times. One DO block (no CONCURRENTLY), so it runs in one go in
-- Navicat / any GUI or with psql:
--   psql "postgresql://USER@HOST:5432/DBNAME" -v ON_ERROR_STOP=1 -f 2026-11-17-csms-folder-id-indexes.sql
-- A table or column that does not exist on this server is skipped with a NOTICE.
-- These are small log tables; plain CREATE INDEX blocks writes on each table only for the moment it takes.
-- The backend creates the same indexes at boot (src/db/ensure/06-csms.ts); after this script it is a no-op.

DO $$
DECLARE
  spec text[];
  specs text[][] := ARRAY[
    -- table,                       column,               index name
    ['csms_approval_log',           'folder_id',          'csms_approval_log_folder_id_idx'],
    ['csms_approval_log',           'contract_id',        'csms_approval_log_contract_id_idx'],
    ['csms_evaluation_email_log',   'folder_id',          'csms_evaluation_email_log_folder_id_idx'],
    ['csms_evaluation_email_log',   'contract_id',        'csms_evaluation_email_log_contract_id_idx'],
    ['csms_ai_feedback',            'folder_id',          'csms_ai_feedback_folder_id_idx'],
    ['csms_ai_apply_log',           'folder_id',          'csms_ai_apply_log_folder_id_idx'],
    ['csms_evidence_chunk',         'contract_folder_id', 'csms_evidence_chunk_contract_folder_id_idx'],
    ['csms_ai_evaluation_job',      'contract_folder_id', 'csms_ai_evaluation_job_contract_folder_id_idx'],
    ['csms_alarm_log',              'contract_id',        'csms_alarm_log_contract_id_idx']
  ];
  analyzed text[] := ARRAY[]::text[];
BEGIN
  FOREACH spec SLICE 1 IN ARRAY specs LOOP
    IF to_regclass(format('public.%I', spec[1])) IS NULL THEN
      RAISE NOTICE 'skip %: table does not exist', spec[1];
      CONTINUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = spec[1] AND column_name = spec[2]) THEN
      RAISE NOTICE 'skip %.%: column does not exist', spec[1], spec[2];
      CONTINUE;
    END IF;
    -- an INVALID index (interrupted build) would make IF NOT EXISTS skip it forever
    IF EXISTS (SELECT 1 FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
               WHERE c.relname = spec[3] AND NOT i.indisvalid) THEN
      RAISE NOTICE 'dropping invalid index %', spec[3];
      EXECUTE format('DROP INDEX %I', spec[3]);
    END IF;
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (%I)', spec[3], spec[1], spec[2]);
    IF NOT spec[1] = ANY (analyzed) THEN
      EXECUTE format('ANALYZE %I', spec[1]);
      analyzed := analyzed || spec[1];
    END IF;
  END LOOP;
END $$;

-- Check: one row per index, valid = true
SELECT i.indrelid::regclass AS table_name, c.relname AS index_name, i.indisvalid AS valid
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
WHERE c.relname IN (
  'csms_approval_log_folder_id_idx', 'csms_approval_log_contract_id_idx',
  'csms_evaluation_email_log_folder_id_idx', 'csms_evaluation_email_log_contract_id_idx',
  'csms_ai_feedback_folder_id_idx', 'csms_ai_apply_log_folder_id_idx',
  'csms_evidence_chunk_contract_folder_id_idx', 'csms_ai_evaluation_job_contract_folder_id_idx',
  'csms_alarm_log_contract_id_idx'
)
ORDER BY 1, 2;
