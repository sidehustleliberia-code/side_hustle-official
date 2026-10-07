-- ============================================================
-- Two-Party Job Completion Workflow
-- Adds awaiting_customer_confirmation status and completion fields
-- ============================================================

-- Step 1: Add new value to job_status enum
-- PostgreSQL allows ALTER TYPE ... ADD VALUE which is idempotent-safe
-- (it errors if value already exists, so we guard with a DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'awaiting_customer_confirmation'
      AND enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'job_status'
      )
  ) THEN
    ALTER TYPE public.job_status ADD VALUE 'awaiting_customer_confirmation' AFTER 'in_progress';
  END IF;
END $$;

-- Step 2: Add completion tracking columns to jobs table
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS provider_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider_completed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_confirmed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- Step 3: Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_jobs_provider_completed_by ON public.jobs(provider_completed_by);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_confirmed_by ON public.jobs(customer_confirmed_by);
-- NOTE: The partial index on job_status = 'awaiting_customer_confirmation' is intentionally omitted here.
-- PostgreSQL requires new enum values to be committed in a separate transaction before they can be
-- referenced in partial index WHERE clauses. A plain index on job_status covers this use case.
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(job_status);

-- Step 4: RLS policies for new columns
-- The existing jobs RLS policies already cover the table; no new table-level policies needed.
-- We add a function to enforce state transition rules server-side.

-- Function: provider marks job complete (in_progress → awaiting_customer_confirmation)
CREATE OR REPLACE FUNCTION public.provider_mark_complete(p_job_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job RECORD;
  v_user_id UUID := auth.uid();
BEGIN
  -- Fetch job
  SELECT id, job_status, provider_id, customer_id, net_payout
  INTO v_job
  FROM public.jobs
  WHERE id = p_job_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job not found');
  END IF;

  -- Authorization: caller must be the assigned provider
  IF v_job.provider_id IS NULL OR v_job.provider_id != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: you are not the assigned provider for this job');
  END IF;

  -- State check: must be in_progress
  IF v_job.job_status != 'in_progress' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job must be in_progress to mark complete. Current status: ' || v_job.job_status::text);
  END IF;

  -- Update job
  UPDATE public.jobs
  SET
    job_status = 'awaiting_customer_confirmation',
    provider_completed_at = now(),
    provider_completed_by = v_user_id,
    updated_at = now()
  WHERE id = p_job_id;

  -- Record status history
  INSERT INTO public.job_status_history (job_id, from_status, to_status, changed_by, note)
  VALUES (p_job_id, 'in_progress', 'awaiting_customer_confirmation', v_user_id, 'Provider marked job complete');

  -- Notify customer
  INSERT INTO public.notifications (user_id, notification_type, title, body, job_id)
  SELECT
    j.customer_id,
    'job_completed',
    'Provider Marked Job Complete',
    'Your provider has marked the job complete. Please review and confirm.',
    p_job_id
  FROM public.jobs j
  WHERE j.id = p_job_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function: customer confirms completion (awaiting_customer_confirmation → completed)
CREATE OR REPLACE FUNCTION public.customer_confirm_completion(p_job_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job RECORD;
  v_user_id UUID := auth.uid();
BEGIN
  -- Fetch job
  SELECT id, job_status, customer_id, provider_id, net_payout, gross_amount, platform_fee
  INTO v_job
  FROM public.jobs
  WHERE id = p_job_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job not found');
  END IF;

  -- Authorization: caller must be the job's customer
  IF v_job.customer_id != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: you do not own this job');
  END IF;

  -- State check: must be awaiting_customer_confirmation
  IF v_job.job_status != 'awaiting_customer_confirmation' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job is not awaiting confirmation. Current status: ' || v_job.job_status::text);
  END IF;

  -- Update job to completed
  UPDATE public.jobs
  SET
    job_status = 'completed',
    customer_confirmed_at = now(),
    customer_confirmed_by = v_user_id,
    completed_at = now(),
    updated_at = now()
  WHERE id = p_job_id;

  -- Record status history
  INSERT INTO public.job_status_history (job_id, from_status, to_status, changed_by, note)
  VALUES (p_job_id, 'awaiting_customer_confirmation', 'completed', v_user_id, 'Customer confirmed completion');

  -- Create/update provider earnings record (mark as released from escrow)
  INSERT INTO public.provider_earnings (provider_id, job_id, gross_amount, platform_fee, net_amount, is_in_escrow, released_at)
  VALUES (v_job.provider_id, p_job_id, v_job.gross_amount, v_job.platform_fee, v_job.net_payout, false, now())
  ON CONFLICT (job_id) DO UPDATE
    SET is_in_escrow = false, released_at = now();

  -- Update provider profile totals
  UPDATE public.provider_profiles
  SET
    total_jobs = total_jobs + 1,
    total_earned = total_earned + v_job.net_payout,
    current_balance = current_balance + v_job.net_payout,
    updated_at = now()
  WHERE user_id = v_job.provider_id;

  -- Update customer profile totals
  UPDATE public.customer_profiles
  SET
    total_jobs = total_jobs + 1,
    total_spent = total_spent + v_job.gross_amount,
    updated_at = now()
  WHERE user_id = v_job.customer_id;

  -- Notify provider
  INSERT INTO public.notifications (user_id, notification_type, title, body, job_id)
  VALUES (
    v_job.provider_id,
    'job_completed',
    'Job Confirmed Complete!',
    'The customer has confirmed your work. Your payout has been processed.',
    p_job_id
  );

  -- Notify customer
  INSERT INTO public.notifications (user_id, notification_type, title, body, job_id)
  VALUES (
    v_job.customer_id,
    'job_completed',
    'Job Completed',
    'Your job has been marked as complete. You can now leave a review.',
    p_job_id
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Add unique constraint on provider_earnings.job_id if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'provider_earnings_job_id_key'
      AND conrelid = 'public.provider_earnings'::regclass
  ) THEN
    ALTER TABLE public.provider_earnings ADD CONSTRAINT provider_earnings_job_id_key UNIQUE (job_id);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not add unique constraint on provider_earnings.job_id: %', SQLERRM;
END $$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.provider_mark_complete(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_confirm_completion(UUID) TO authenticated;
