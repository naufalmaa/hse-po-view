-- Columns that record who last changed each note of a contract folder (element):
--   note            (tab "User", written by admin / auditor PHE)  -> note_updated_by, note_updated_at
--   note_contractor (tab "Kontraktor", written by the contractor) -> note_contractor_updated_by, note_contractor_updated_at
-- The Catatan panel shows them as "Kontraktor · <name> · <date>". Existing notes stay without an author (no reliable source).
--
-- Idempotent and safe to run any number of times (Navicat: run in one go). Adding nullable columns without a
-- default is a metadata-only change, it does not rewrite the table.
-- The backend adds the same columns at boot (src/db/ensure/06-csms.ts); run this before deploying the backend.

ALTER TABLE csms_contract_folder ADD COLUMN IF NOT EXISTS note_updated_by UUID;
ALTER TABLE csms_contract_folder ADD COLUMN IF NOT EXISTS note_updated_at TIMESTAMPTZ;
ALTER TABLE csms_contract_folder ADD COLUMN IF NOT EXISTS note_contractor_updated_by UUID;
ALTER TABLE csms_contract_folder ADD COLUMN IF NOT EXISTS note_contractor_updated_at TIMESTAMPTZ;

-- Check: 4 rows
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'csms_contract_folder'
  AND column_name IN ('note_updated_by', 'note_updated_at', 'note_contractor_updated_by', 'note_contractor_updated_at')
ORDER BY column_name;
