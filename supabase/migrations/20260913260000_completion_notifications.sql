-- ============================================================
-- Completion Notifications Enhancement
-- Ensures customers receive notifications when:
--   1. Provider marks job complete (awaiting_customer_confirmation)
--   2. Job is fully completed (review reminder)
-- The provider_mark_complete RPC already inserts a direct notification,
-- but this trigger ensures the awaiting_customer_confirmation state
-- is also covered via the trigger path for consistency.
-- ============================================================

-- Update the customer notification trigger to include awaiting_customer_confirmation
CREATE OR REPLACE FUNCTION public.notify_customer_job_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Notify customer when provider is assigned
  IF NEW.job_status = 'assigned' AND OLD.job_status IS DISTINCT FROM 'assigned' THEN
    PERFORM public.create_notification(
      NEW.customer_id,
      'job_assigned'::public.notification_type,
      'Provider Assigned to Your Job',
      'A provider has been assigned to your ' || NEW.service_label || ' request (' || NEW.ref || ').',
      NEW.id
    );
  END IF;

  -- Notify customer when job starts
  IF NEW.job_status = 'in_progress' AND OLD.job_status IS DISTINCT FROM 'in_progress' THEN
    PERFORM public.create_notification(
      NEW.customer_id,
      'job_started'::public.notification_type,
      'Your Service Has Started',
      'Your ' || NEW.service_label || ' service (' || NEW.ref || ') is now in progress.',
      NEW.id
    );
  END IF;

  -- Notify customer when provider marks job complete — action required
  IF NEW.job_status = 'awaiting_customer_confirmation' AND OLD.job_status IS DISTINCT FROM 'awaiting_customer_confirmation' THEN
    PERFORM public.create_notification(
      NEW.customer_id,
      'job_completed'::public.notification_type,
      'Action Required: Confirm Job Completion',
      'Your provider has marked the ' || NEW.service_label || ' job (' || NEW.ref || ') as complete. Please review and confirm.',
      NEW.id
    );
  END IF;

  -- Notify customer when job is fully completed
  IF NEW.job_status = 'completed' AND OLD.job_status IS DISTINCT FROM 'completed' THEN
    PERFORM public.create_notification(
      NEW.customer_id,
      'job_completed'::public.notification_type,
      'Service Completed',
      'Your ' || NEW.service_label || ' service (' || NEW.ref || ') has been completed successfully. You can now leave a review.',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Re-attach the trigger (DROP + CREATE to ensure updated function is used)
DROP TRIGGER IF EXISTS on_job_status_change_notify_customer ON public.jobs;
CREATE TRIGGER on_job_status_change_notify_customer
  AFTER UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_customer_job_update();
