-- ============================================================
-- SideHustle — Phase 3 Migration
-- Adds: provider availability enforcement, notification enhancements,
--       customer profile linking, and job-matching DB-level guard
-- ============================================================

-- 1. Add new notification_type values for new events
-- The existing notification_type ENUM already covers most cases.
-- We extend it to include 'new_job_match' and 'job_offer' for provider-specific events.
-- NOTE: PostgreSQL requires ALTER TYPE to add enum values.
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'new_job_match';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'job_offer';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'availability_changed';

-- 2. Ensure provider_profiles has is_available column (already exists, but add index)
CREATE INDEX IF NOT EXISTS idx_provider_profiles_is_available
  ON public.provider_profiles (is_available);

-- 3. Add index on notifications for fast unread count queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, is_read, created_at DESC);

-- 4. Add index on jobs for customer lookup (customer dashboard)
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id_status
  ON public.jobs (customer_id, job_status, created_at DESC);

-- 5. Add index on payments for customer lookup
CREATE INDEX IF NOT EXISTS idx_payments_payer_id
  ON public.payments (payer_id, created_at DESC);

-- ============================================================
-- DB-LEVEL FUNCTION: Enforce provider availability before job assignment
-- This prevents offline providers from being matched to new jobs
-- even if the frontend bypasses the check.
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_provider_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  provider_available BOOLEAN;
BEGIN
  -- Only enforce when a provider is being assigned (provider_id is being set)
  -- and the job is transitioning to 'assigned' status
  IF NEW.provider_id IS NOT NULL AND NEW.job_status = 'assigned' THEN
    -- Check if the provider is currently online/available
    SELECT is_available INTO provider_available
    FROM public.provider_profiles
    WHERE user_id = NEW.provider_id;

    -- Block assignment if provider is offline
    IF provider_available IS FALSE THEN
      RAISE EXCEPTION 'Provider is currently offline and cannot be assigned to new jobs';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach the availability enforcement trigger to jobs table
DROP TRIGGER IF EXISTS check_provider_availability_on_assign ON public.jobs;
CREATE TRIGGER check_provider_availability_on_assign
  BEFORE INSERT OR UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_provider_availability();

-- ============================================================
-- DB-LEVEL FUNCTION: Filter available jobs to only online providers
-- Used by the getAvailableJobs query — offline providers see no jobs
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_available_jobs_for_provider(p_user_id UUID)
RETURNS SETOF public.jobs
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  provider_available BOOLEAN;
BEGIN
  -- Check if this provider is online
  SELECT is_available INTO provider_available
  FROM public.provider_profiles
  WHERE user_id = p_user_id;

  -- Return empty set if provider is offline — they should not see new jobs
  IF provider_available IS FALSE THEN
    RETURN;
  END IF;

  -- Return jobs ready for assignment
  RETURN QUERY
  SELECT * FROM public.jobs
  WHERE job_status = 'ready_for_assignment'
  ORDER BY created_at DESC;
END;
$$;

-- ============================================================
-- FUNCTION: Create a notification (deduplication-safe)
-- Prevents duplicate notifications for the same event
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type public.notification_type,
  p_title TEXT,
  p_body TEXT,
  p_job_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
  existing_id UUID;
BEGIN
  -- Deduplication: check if an identical unread notification already exists
  -- within the last 60 seconds to prevent duplicate event processing
  SELECT id INTO existing_id
  FROM public.notifications
  WHERE user_id = p_user_id
    AND notification_type = p_type
    AND (p_job_id IS NULL OR job_id = p_job_id)
    AND is_read = false
    AND created_at > NOW() - INTERVAL '60 seconds'
  LIMIT 1;

  -- Return existing notification ID if duplicate found
  IF existing_id IS NOT NULL THEN
    RETURN existing_id;
  END IF;

  -- Insert new notification
  INSERT INTO public.notifications (user_id, notification_type, title, body, job_id, is_read)
  VALUES (p_user_id, p_type, p_title, p_body, p_job_id, false)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- ============================================================
-- FUNCTION: Auto-notify providers when a new job becomes available
-- Fires when a job transitions to ready_for_assignment status
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_providers_new_job()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only fire when job becomes ready_for_assignment
  IF NEW.job_status = 'ready_for_assignment' AND
     (OLD.job_status IS DISTINCT FROM 'ready_for_assignment') THEN

    -- Notify all ONLINE providers about the new job opportunity
    INSERT INTO public.notifications (user_id, notification_type, title, body, job_id, is_read)
    SELECT
      pp.user_id,
      'new_job_match'::public.notification_type,
      'New Job Available: ' || NEW.service_label,
      'A new job in ' || NEW.area || ' is ready for pickup. Payout: LRD ' || NEW.net_payout::TEXT,
      NEW.id,
      false
    FROM public.provider_profiles pp
    WHERE pp.is_available = true
      AND pp.provider_status = 'active'
      -- Deduplicate: don't re-notify if notification already exists for this job
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = pp.user_id
          AND n.job_id = NEW.id
          AND n.notification_type = 'new_job_match'
      );
  END IF;

  -- Notify the assigned provider when a job is assigned to them
  IF NEW.job_status = 'assigned' AND NEW.provider_id IS NOT NULL AND
     (OLD.provider_id IS DISTINCT FROM NEW.provider_id OR OLD.job_status IS DISTINCT FROM 'assigned') THEN

    PERFORM public.create_notification(
      NEW.provider_id,
      'job_assigned'::public.notification_type,
      'Job Assigned: ' || NEW.service_label,
      'You have been assigned job ' || NEW.ref || '. Please proceed to ' || NEW.address,
      NEW.id
    );
  END IF;

  -- Notify provider when job is completed
  IF NEW.job_status = 'completed' AND OLD.job_status IS DISTINCT FROM 'completed' AND NEW.provider_id IS NOT NULL THEN
    PERFORM public.create_notification(
      NEW.provider_id,
      'job_completed'::public.notification_type,
      'Job Completed: ' || NEW.service_label,
      'Job ' || NEW.ref || ' has been marked complete. Your earnings are in escrow.',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Attach job notification trigger
DROP TRIGGER IF EXISTS on_job_status_change_notify ON public.jobs;
CREATE TRIGGER on_job_status_change_notify
  AFTER INSERT OR UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_providers_new_job();

-- ============================================================
-- FUNCTION: Notify customer when their job status changes
-- ============================================================
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

  -- Notify customer when job is completed
  IF NEW.job_status = 'completed' AND OLD.job_status IS DISTINCT FROM 'completed' THEN
    PERFORM public.create_notification(
      NEW.customer_id,
      'job_completed'::public.notification_type,
      'Service Completed',
      'Your ' || NEW.service_label || ' service (' || NEW.ref || ') has been completed successfully.',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Attach customer notification trigger
DROP TRIGGER IF EXISTS on_job_status_change_notify_customer ON public.jobs;
CREATE TRIGGER on_job_status_change_notify_customer
  AFTER UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_customer_job_update();

-- ============================================================
-- FUNCTION: Auto-create customer_profile on first job creation
-- Ensures every customer who books a job has a customer_profile record
-- ============================================================
CREATE OR REPLACE FUNCTION public.ensure_customer_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create customer_profile if it doesn't exist for this user
  INSERT INTO public.customer_profiles (user_id)
  VALUES (NEW.customer_id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_job_created_ensure_customer_profile ON public.jobs;
CREATE TRIGGER on_job_created_ensure_customer_profile
  AFTER INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_customer_profile();

-- ============================================================
-- FUNCTION: Update customer_profile totals when job completes
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_customer_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.job_status = 'completed' AND OLD.job_status IS DISTINCT FROM 'completed' THEN
    UPDATE public.customer_profiles
    SET
      total_jobs = total_jobs + 1,
      total_spent = total_spent + NEW.gross_amount,
      updated_at = NOW()
    WHERE user_id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_job_completed_update_customer ON public.jobs;
CREATE TRIGGER on_job_completed_update_customer
  AFTER UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customer_totals();

-- ============================================================
-- RLS: Ensure notifications are accessible to their owner
-- (Already enabled in foundation migration — just add missing policies)
-- ============================================================
DROP POLICY IF EXISTS "users_read_own_notifications" ON public.notifications;
CREATE POLICY "users_read_own_notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_update_own_notifications" ON public.notifications;
CREATE POLICY "users_update_own_notifications"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow system (SECURITY DEFINER functions) to insert notifications
DROP POLICY IF EXISTS "system_insert_notifications" ON public.notifications;
CREATE POLICY "system_insert_notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================
-- RLS: Customer profiles — customers can read/update their own
-- ============================================================
DROP POLICY IF EXISTS "customers_manage_own_profile" ON public.customer_profiles;
CREATE POLICY "customers_manage_own_profile"
  ON public.customer_profiles
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- RLS: Jobs — customers can read their own jobs
-- ============================================================
DROP POLICY IF EXISTS "customers_read_own_jobs" ON public.jobs;
CREATE POLICY "customers_read_own_jobs"
  ON public.jobs
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

-- ============================================================
-- RLS: Payments — customers can read payments for their jobs
-- ============================================================
DROP POLICY IF EXISTS "customers_read_own_payments" ON public.payments;
CREATE POLICY "customers_read_own_payments"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (payer_id = auth.uid());
