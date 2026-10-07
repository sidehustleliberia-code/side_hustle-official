-- Fix: job_status_history RLS violation (error code 42501)
-- Root cause: log_job_status_change trigger runs as the calling user, but
-- job_status_history has no INSERT RLS policy — only SELECT.
-- Fix: Recreate the trigger function as SECURITY DEFINER so it bypasses RLS
-- when writing audit log entries (standard pattern for audit triggers).

CREATE OR REPLACE FUNCTION public.log_job_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.job_status IS DISTINCT FROM NEW.job_status THEN
    INSERT INTO public.job_status_history (job_id, from_status, to_status)
    VALUES (NEW.id, OLD.job_status, NEW.job_status);
  END IF;
  RETURN NEW;
END;
$$;
