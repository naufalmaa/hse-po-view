import type pg from 'pg';

export async function ensureCsmsSchema(client: pg.PoolClient | pg.Pool, options: { hasVector: boolean }): Promise<void> {
  await client.query(`
    DO $$ 
    BEGIN 
      -- 1. csms_guideline
      CREATE TABLE IF NOT EXISTS csms_guideline (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- 2. csms_risk_assessment
      CREATE TABLE IF NOT EXISTS csms_risk_assessment (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contractor_id UUID NOT NULL REFERENCES sub_contractors(id) ON DELETE CASCADE,
        title VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(100) NOT NULL,
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- 3. csms_qualification_assessment
      CREATE TABLE IF NOT EXISTS csms_qualification_assessment (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contractor_id UUID NOT NULL REFERENCES sub_contractors(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        number_certificate VARCHAR(255) NOT NULL,
        assessment_date DATE NOT NULL,
        expired_date DATE NOT NULL,
        qualified_value VARCHAR(255) NOT NULL,
        assessment_result VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- 4. csms_contract
      CREATE TABLE IF NOT EXISTS csms_contract (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contractor_id UUID NOT NULL REFERENCES sub_contractors(id) ON DELETE CASCADE,
        vessel_id UUID REFERENCES vessels(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        number_contract VARCHAR(255) NOT NULL,
        risk_assessment_id VARCHAR(255) NOT NULL DEFAULT '-',
        risk_level VARCHAR(50) NOT NULL DEFAULT 'N/A',
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        nearest_ongoing_assessment_date JSONB,
        final_assessment_date DATE NOT NULL,
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        extra JSONB
      );

      -- 5. csms_file
      CREATE TABLE IF NOT EXISTS csms_file (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        guideline_id UUID REFERENCES csms_guideline(id) ON DELETE CASCADE,
        risk_assessment_id UUID REFERENCES csms_risk_assessment(id) ON DELETE CASCADE,
        qualification_assessment_id UUID REFERENCES csms_qualification_assessment(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(255) NOT NULL,
        file_path TEXT NOT NULL,
        note TEXT
      );

      -- 6. csms_contract_folder
      CREATE TABLE IF NOT EXISTS csms_contract_folder (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contract_id UUID NOT NULL REFERENCES csms_contract(id) ON DELETE CASCADE,
        parent_id UUID REFERENCES csms_contract_folder(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        path ltree NOT NULL,
        depth INTEGER GENERATED ALWAYS AS ((nlevel(path) - 1)::integer) STORED,
        file_type VARCHAR(50),
        file_path TEXT,
        is_complete BOOLEAN,
        status "StatusContractEnum" NOT NULL DEFAULT 'pending',
        score NUMERIC(4, 1) NOT NULL DEFAULT 0,
        ai_status "StatusContractEnum" NOT NULL DEFAULT 'pending',
        ai_score NUMERIC(4, 1) NOT NULL DEFAULT 0,
        ai_reasoning TEXT,
        note TEXT,
        note_contractor TEXT,
        user_id UUID[],
        is_final BOOLEAN,
        is_copy INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        assessment_date TIMESTAMPTZ,
        ai_processed_at TIMESTAMPTZ
      );

      -- 7. csms_approval_log
      CREATE TABLE IF NOT EXISTS csms_approval_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        folder_id UUID NOT NULL REFERENCES csms_contract_folder(id) ON DELETE CASCADE,
        contract_id UUID NOT NULL REFERENCES csms_contract(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        approval_level VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- 8. csms_alarm_log
      CREATE TABLE IF NOT EXISTS csms_alarm_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contractor_id UUID NOT NULL REFERENCES sub_contractors(id) ON DELETE CASCADE,
        contract_id UUID REFERENCES csms_contract(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        status TEXT,
        triggered_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 9. csms_evaluation_email_log
      CREATE TABLE IF NOT EXISTS csms_evaluation_email_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contract_id UUID NOT NULL REFERENCES csms_contract(id) ON DELETE CASCADE,
        folder_id UUID NOT NULL REFERENCES csms_contract_folder(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        email VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'sent',
        error_message TEXT,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- 10. csms_knowledge_base (without vector column initially)
      CREATE TABLE IF NOT EXISTS csms_knowledge_base (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category_id VARCHAR(50) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        document_requirements JSONB,
        validation_rules JSONB,
        scoring_rules JSONB,
        user_context TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- 11. csms_evidence_chunk (without vector column initially)
      CREATE TABLE IF NOT EXISTS csms_evidence_chunk (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contract_folder_id UUID NOT NULL REFERENCES csms_contract_folder(id) ON DELETE CASCADE,
        file_path TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- 12. csms_ai_evaluation_job
      CREATE TABLE IF NOT EXISTS csms_ai_evaluation_job (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contract_folder_id UUID NOT NULL REFERENCES csms_contract_folder(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id),
        status VARCHAR(50) NOT NULL DEFAULT 'queued',
        progress_message TEXT,
        error_message TEXT,
        juror_scores JSONB,
        model_used VARCHAR(100),
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    END $$;
  `);

  // Ensure risk_assessment_id and risk_level columns in csms_contract for existing tables
  await client.query(`
    ALTER TABLE csms_contract ADD COLUMN IF NOT EXISTS risk_assessment_id VARCHAR(255) NOT NULL DEFAULT '-';
    ALTER TABLE csms_ai_evaluation_job ADD COLUMN IF NOT EXISTS target_folder_ids UUID[];
    ALTER TABLE csms_ai_evaluation_job ADD COLUMN IF NOT EXISTS mode VARCHAR(20) NOT NULL DEFAULT 'thorough';
    ALTER TABLE csms_ai_evaluation_job ADD COLUMN IF NOT EXISTS trial BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE csms_ai_evaluation_job ADD COLUMN IF NOT EXISTS rubric_version_id UUID;
    -- trial runs (same DDL as csms-ai/server/main.py TRIAL_DDL)
    CREATE TABLE IF NOT EXISTS csms_ai_trial_snapshot (
      job_id UUID NOT NULL, folder_id UUID NOT NULL, ai_score NUMERIC(5, 2), ai_status VARCHAR(20), ai_reasoning TEXT,
      ai_processed_at TIMESTAMPTZ, PRIMARY KEY (job_id, folder_id));
    CREATE TABLE IF NOT EXISTS csms_ai_trial_result (
      job_id UUID NOT NULL, folder_id UUID NOT NULL, rubric_version_id UUID, element_code VARCHAR(10), ai_score NUMERIC(5, 2),
      ai_status VARCHAR(20), confidence NUMERIC(4, 2), evaluator_score NUMERIC(5, 2), evaluator_status VARCHAR(20),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (job_id, folder_id));
    -- per-file summaries for the thorough AI mode (cache: file never changes, re-upload = new id)
    CREATE TABLE IF NOT EXISTS csms_ai_file_summary (
      file_id UUID NOT NULL,
      element_code VARCHAR(10) NOT NULL,
      rubric_version INTEGER NOT NULL DEFAULT 0,
      summary JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (file_id, element_code, rubric_version)
    );
    -- evaluator (admin) corrections of AI scores, used as examples for later AI runs
    CREATE TABLE IF NOT EXISTS csms_ai_feedback (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      folder_id UUID NOT NULL REFERENCES csms_contract_folder(id) ON DELETE CASCADE,
      element_code VARCHAR(10) NOT NULL,
      ai_score NUMERIC(5, 2),
      evaluator_score NUMERIC(5, 2),
      reason TEXT NOT NULL,
      user_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    -- 'evaluator' (dialog Penilaian) | 'sintetis' (draf kalibrasi, bisa dihapus admin)
    ALTER TABLE csms_ai_feedback ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'evaluator';
    CREATE INDEX IF NOT EXISTS csms_ai_feedback_element_idx ON csms_ai_feedback (element_code, created_at DESC);
    -- "Terapkan rekomendasi AI": previous evaluator values per apply, for undo
    CREATE TABLE IF NOT EXISTS csms_ai_apply_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      batch_id UUID NOT NULL,
      root_id UUID NOT NULL REFERENCES csms_contract_folder(id) ON DELETE CASCADE,
      folder_id UUID NOT NULL REFERENCES csms_contract_folder(id) ON DELETE CASCADE,
      prev_status VARCHAR(20),
      prev_score NUMERIC(5, 2),
      prev_note TEXT,
      user_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      undone_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS csms_ai_apply_log_root_idx ON csms_ai_apply_log (root_id, created_at DESC);
    -- AI rubric (kriteria penilaian Excel), versioned; same DDL as csms-ai/server/rubric.py
    CREATE TABLE IF NOT EXISTS csms_ai_rubric_version (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rubric_type VARCHAR(20) NOT NULL DEFAULT 'marine',
      version INTEGER NOT NULL,
      label TEXT,
      source_filename TEXT,
      is_active BOOLEAN NOT NULL DEFAULT FALSE,
      created_by UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (rubric_type, version)
    );
    CREATE TABLE IF NOT EXISTS csms_ai_rubric_item (
      version_id UUID NOT NULL REFERENCES csms_ai_rubric_version(id) ON DELETE CASCADE,
      no VARCHAR(10) NOT NULL,
      element_category TEXT, element TEXT, required_document TEXT, document_format TEXT, evaluation_criteria TEXT,
      mandatory_fields TEXT, score_0 TEXT, score_3 TEXT, score_6 TEXT, score_10 TEXT, status_accept TEXT,
      status_reject TEXT, status_revision TEXT, validation_method TEXT, ai_checkpoint_keywords TEXT,
      document_expiry_check TEXT, ai_confidence_threshold TEXT, ai_reasoning_hint TEXT, notes TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (version_id, no)
    );
    ALTER TABLE csms_contract ADD COLUMN IF NOT EXISTS risk_level VARCHAR(50) NOT NULL DEFAULT 'N/A';
    ALTER TABLE csms_contract_folder ALTER COLUMN score TYPE NUMERIC(5, 2);
    ALTER TABLE csms_contract_folder ALTER COLUMN ai_score TYPE NUMERIC(5, 2);
    -- who last changed each note (scripts/sql/2026-11-24-csms-note-author.sql does the same)
    ALTER TABLE csms_contract_folder ADD COLUMN IF NOT EXISTS note_updated_by UUID;
    ALTER TABLE csms_contract_folder ADD COLUMN IF NOT EXISTS note_updated_at TIMESTAMPTZ;
    ALTER TABLE csms_contract_folder ADD COLUMN IF NOT EXISTS note_contractor_updated_by UUID;
    ALTER TABLE csms_contract_folder ADD COLUMN IF NOT EXISTS note_contractor_updated_at TIMESTAMPTZ;
  `);

  // Indexes for the folder tree (only the primary key existed): every ON DELETE CASCADE check on parent_id,
  // every children lookup and every per-contract load was a full table scan. Same names as the Drizzle schema
  // and scripts/sql/2026-11-17-csms-contract-folder-indexes.sql (that script builds them CONCURRENTLY on a live
  // server; once it ran, these statements are no-ops). Plain CREATE INDEX briefly blocks writes on this table.
  try {
    await client.query(`
      CREATE INDEX IF NOT EXISTS csms_contract_folder_parent_id_idx ON csms_contract_folder (parent_id);
      CREATE INDEX IF NOT EXISTS csms_contract_folder_contract_id_idx ON csms_contract_folder (contract_id);
      CREATE INDEX IF NOT EXISTS csms_contract_folder_path_gist_idx ON csms_contract_folder USING gist (path);
    `);
  } catch (err: any) {
    console.warn('[DB Auto-Ensure] Notice: Could not create csms_contract_folder indexes:', err?.message || err);
  }

  // Indexes on the foreign keys that point to csms_contract_folder / csms_contract (used by every ON DELETE CASCADE
  // and by lookups per folder). Same names as scripts/sql/2026-11-17-csms-folder-id-indexes.sql; tables that do not
  // exist on this database (e.g. without pgvector) are skipped.
  const fkIndexes: Array<[table: string, column: string, name: string]> = [
    ['csms_approval_log', 'folder_id', 'csms_approval_log_folder_id_idx'],
    ['csms_approval_log', 'contract_id', 'csms_approval_log_contract_id_idx'],
    ['csms_evaluation_email_log', 'folder_id', 'csms_evaluation_email_log_folder_id_idx'],
    ['csms_evaluation_email_log', 'contract_id', 'csms_evaluation_email_log_contract_id_idx'],
    ['csms_ai_feedback', 'folder_id', 'csms_ai_feedback_folder_id_idx'],
    ['csms_ai_apply_log', 'folder_id', 'csms_ai_apply_log_folder_id_idx'],
    ['csms_evidence_chunk', 'contract_folder_id', 'csms_evidence_chunk_contract_folder_id_idx'],
    ['csms_ai_evaluation_job', 'contract_folder_id', 'csms_ai_evaluation_job_contract_folder_id_idx'],
    ['csms_alarm_log', 'contract_id', 'csms_alarm_log_contract_id_idx'],
  ];
  for (const [table, column, name] of fkIndexes) {
    try {
      const exists = await client.query(
        `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
        [table, column],
      );
      if (exists.rowCount === 0) continue;
      await client.query(`CREATE INDEX IF NOT EXISTS "${name}" ON "${table}" ("${column}")`);
    } catch (err: any) {
      console.warn(`[DB Auto-Ensure] Notice: Could not create index ${name}:`, err?.message || err);
    }
  }

  // Vector embeddings columns if pgvector is available
  if (options.hasVector) {
    try {
      await client.query(`
        ALTER TABLE csms_knowledge_base ADD COLUMN IF NOT EXISTS embedding vector(1536);
        ALTER TABLE csms_evidence_chunk ADD COLUMN IF NOT EXISTS embedding vector(1536);
      `);
    } catch (err: any) {
      console.warn('[DB Auto-Ensure] Notice: Could not add vector(1536) column to CSMS tables:', err?.message || err);
    }
  }

  // Auto-convert any root PB folder at contract final/end date to PA if contract has no PA folder
  try {
    await client.query(`
      UPDATE csms_contract_folder f
      SET name = REPLACE(f.name, ' - PB', ' - PA'),
          description = REPLACE(f.description, 'Penilaian Berjalan', 'Penilaian Akhir'),
          updated_at = NOW()
      FROM csms_contract c
      WHERE f.contract_id = c.id
        AND f.depth = 0
        AND f.name LIKE '% - PB'
        AND (
          f.assessment_date::date = c.final_assessment_date::date
          OR f.name LIKE TO_CHAR(c.final_assessment_date, 'DD-MM-YYYY') || ' - PB'
          OR f.assessment_date::date = c.end_date::date
          OR f.name LIKE TO_CHAR(c.end_date, 'DD-MM-YYYY') || ' - PB'
        )
        AND NOT EXISTS (
          SELECT 1 FROM csms_contract_folder pa
          WHERE pa.contract_id = c.id
            AND pa.depth = 0
            AND pa.name LIKE '% - PA'
        );
    `);
  } catch (err: any) {
    console.warn('[DB Auto-Ensure] Notice: Could not auto-convert end PB folder to PA:', err?.message || err);
  }
}
