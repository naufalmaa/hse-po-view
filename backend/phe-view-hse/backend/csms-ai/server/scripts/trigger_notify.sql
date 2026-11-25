-- Trigger function: send NOTIFY when job status changes to completed/failed
CREATE OR REPLACE FUNCTION notify_ai_evaluation_complete()
RETURNS trigger AS $$
BEGIN
  IF NEW.status IN ('completed', 'failed') THEN
    PERFORM pg_notify(
      'csms_ai_evaluation_channel',
      json_build_object(
        'folderId', NEW.contract_folder_id,
        'jobId', NEW.id,
        'status', NEW.status
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER trg_ai_evaluation_notify
  AFTER UPDATE OF status
  ON csms_ai_evaluation_job
  FOR EACH ROW
  EXECUTE FUNCTION notify_ai_evaluation_complete();
