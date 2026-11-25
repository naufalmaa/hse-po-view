"""DDL tabel milik csms-ai di luar rubric (rubric: server/rubric.py DDL)."""
TRIAL_DDL = """
CREATE TABLE IF NOT EXISTS csms_ai_trial_snapshot (
  job_id UUID NOT NULL, folder_id UUID NOT NULL, ai_score NUMERIC(5, 2), ai_status VARCHAR(20), ai_reasoning TEXT,
  ai_processed_at TIMESTAMPTZ, PRIMARY KEY (job_id, folder_id));
CREATE TABLE IF NOT EXISTS csms_ai_trial_result (
  job_id UUID NOT NULL, folder_id UUID NOT NULL, rubric_version_id UUID, element_code VARCHAR(10), ai_score NUMERIC(5, 2),
  ai_status VARCHAR(20), confidence NUMERIC(4, 2), evaluator_score NUMERIC(5, 2), evaluator_status VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (job_id, folder_id));
"""
