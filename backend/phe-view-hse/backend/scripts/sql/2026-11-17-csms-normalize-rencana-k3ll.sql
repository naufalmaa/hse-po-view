-- Normalize every assessment period to the standard structure:
--   <period root> / A. RENCANA K3LL / 1..8 <category> / x.y <sub element> / files
-- Some periods have the categories 1..8 directly under the root (no "A. RENCANA K3LL"). This script creates the
-- "A. RENCANA K3LL" folder in those periods and moves the categories (with everything below them) into it.
--
-- * Idempotent: a period that already has "A. RENCANA K3LL" is never changed; running again does nothing.
-- * Navicat friendly: one DO block, no CONCURRENTLY. Runs as one transaction: an error changes nothing.
-- * Backup first: every row of an affected period is copied to csms_contract_folder_bak_20261117_rencana.
-- * Only parent_id and path (ltree; depth follows automatically) change; ids, files on disk, scores, statuses
--   and notes of the moved folders stay the same. The new folder gets score/isComplete/isCopy computed like
--   the application does for "A. RENCANA K3LL" (sum of active category scores, all categories complete,
--   isCopy aggregated from the categories). The root score does not change (same formula for both structures).
-- * A period that has BOTH "A. RENCANA K3LL" and categories directly under the root (a second tree left by an
--   old copy between periods) is NOT touched; it is listed by the check at the end for a manual decision.
--
-- Rollback for one period (if ever needed):
--   UPDATE csms_contract_folder f SET parent_id = b.parent_id, path = b.path
--     FROM csms_contract_folder_bak_20261117_rencana b WHERE b.id = f.id AND <period filter>;
--   then DELETE the created "A. RENCANA K3LL" folder of that period.

CREATE TABLE IF NOT EXISTS csms_contract_folder_bak_20261117_rencana AS
  SELECT f.*, now() AS backed_up_at FROM csms_contract_folder f WITH NO DATA;

DO $$
DECLARE
  per record;
  cat record;
  rencana_id uuid;
  moved int;
  total int := 0;
BEGIN
  FOR per IN
    SELECT root.id, root.name, root.contract_id, root.path
    FROM csms_contract_folder root
    WHERE root.depth = 0
      AND EXISTS (SELECT 1 FROM csms_contract_folder c
                  WHERE c.parent_id = root.id AND c.file_type = 'folder' AND c.name ~ '^[1-8]\s')
    ORDER BY root.contract_id, root.name
  LOOP
    IF EXISTS (SELECT 1 FROM csms_contract_folder a
               WHERE a.parent_id = per.id AND a.file_type = 'folder' AND a.name = 'A. RENCANA K3LL') THEN
      RAISE NOTICE 'SKIP %  (contract %): has A. RENCANA K3LL AND categories directly under the root (second tree), check manually',
        per.name, per.contract_id;
      CONTINUE;
    END IF;

    -- backup of the whole period (rows not backed up yet)
    INSERT INTO csms_contract_folder_bak_20261117_rencana
    SELECT f.*, now() FROM csms_contract_folder f
    WHERE f.contract_id = per.contract_id AND f.path <@ per.path
      AND NOT EXISTS (SELECT 1 FROM csms_contract_folder_bak_20261117_rencana b WHERE b.id = f.id);

    rencana_id := gen_random_uuid();
    INSERT INTO csms_contract_folder (id, contract_id, parent_id, name, description, path, file_type, status, score, is_copy, created_at, updated_at)
    VALUES (rencana_id, per.contract_id, per.id, 'A. RENCANA K3LL', 'A. RENCANA K3LL',
            (per.path::text || '.' || rencana_id::text)::ltree, 'folder', 'pending', 0, 0, now(), now());

    moved := 0;
    FOR cat IN
      SELECT id, path FROM csms_contract_folder
      WHERE parent_id = per.id AND file_type = 'folder' AND name ~ '^[1-8]\s'
    LOOP
      -- the category and its whole subtree: <root>.<category>... -> <root>.<rencana>.<category>...
      UPDATE csms_contract_folder f
      SET path = (per.path::text || '.' || rencana_id::text || '.' || subpath(f.path, nlevel(per.path))::text)::ltree
      WHERE f.contract_id = per.contract_id AND f.path <@ cat.path;
      UPDATE csms_contract_folder SET parent_id = rencana_id, updated_at = now() WHERE id = cat.id;
      moved := moved + 1;
    END LOOP;

    -- values of "A. RENCANA K3LL" as the application computes them
    UPDATE csms_contract_folder a SET
      score = coalesce((SELECT CASE WHEN count(*) FILTER (WHERE k.score <> -1) = 0 THEN -1
                                    ELSE round(sum(k.score) FILTER (WHERE k.score <> -1), 1) END
                        FROM csms_contract_folder k WHERE k.parent_id = a.id AND k.file_type = 'folder' AND k.name ~ '^[1-8]\s'), 0),
      is_complete = (SELECT bool_and(coalesce(k.is_complete, false)) FROM csms_contract_folder k WHERE k.parent_id = a.id),
      is_copy = (SELECT CASE WHEN bool_or(coalesce(k.is_copy, 0) = 0) THEN 0
                             WHEN bool_or(coalesce(k.is_copy, 0) = 2) THEN 2
                             WHEN bool_and(coalesce(k.is_copy, 0) = 1) THEN 1 ELSE 0 END
                 FROM csms_contract_folder k WHERE k.parent_id = a.id)
    WHERE a.id = rencana_id;

    total := total + 1;
    RAISE NOTICE 'OK   %  (contract %): A. RENCANA K3LL created, % categories moved', per.name, per.contract_id, moved;
  END LOOP;
  RAISE NOTICE 'done: % period(s) normalized', total;
END $$;

-- Check 1: periods with categories directly under the root and no "A. RENCANA K3LL" -> must be 0
SELECT count(*) AS periods_without_rencana
FROM csms_contract_folder root
WHERE root.depth = 0
  AND EXISTS (SELECT 1 FROM csms_contract_folder c WHERE c.parent_id = root.id AND c.file_type = 'folder' AND c.name ~ '^[1-8]\s')
  AND NOT EXISTS (SELECT 1 FROM csms_contract_folder a WHERE a.parent_id = root.id AND a.file_type = 'folder' AND a.name = 'A. RENCANA K3LL');

-- Check 2: periods with a second tree (A. RENCANA K3LL + categories directly under the root): decide manually
SELECT ct.title AS contract, root.name AS period, root.id AS period_id
FROM csms_contract_folder root
JOIN csms_contract ct ON ct.id = root.contract_id
WHERE root.depth = 0
  AND EXISTS (SELECT 1 FROM csms_contract_folder c WHERE c.parent_id = root.id AND c.file_type = 'folder' AND c.name ~ '^[1-8]\s')
  AND EXISTS (SELECT 1 FROM csms_contract_folder a WHERE a.parent_id = root.id AND a.file_type = 'folder' AND a.name = 'A. RENCANA K3LL')
ORDER BY 1, 2;

-- Check 3: paths consistent with parents after the move (must be 0)
SELECT count(*) AS inconsistent_paths
FROM csms_contract_folder f JOIN csms_contract_folder p ON p.id = f.parent_id
WHERE f.path <> (p.path::text || '.' || f.id::text)::ltree
  AND f.id IN (SELECT id FROM csms_contract_folder_bak_20261117_rencana);
