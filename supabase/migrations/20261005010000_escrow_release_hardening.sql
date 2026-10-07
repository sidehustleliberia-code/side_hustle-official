-- ============================================================
-- Escrow release hardening: keep disputed jobs in escrow and enforce
-- the 15% platform fee calculation at the release-to-wallet step.
-- ============================================================

CREATE OR REPLACE FUNCTION public.customer_confirm_completion(p_job_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job RECORD;
  v_user_id UUID := auth.uid();
  v_active_dispute BOOLEAN;
  v_expected_net NUMERIC(12,2);
BEGIN
  SELECT id, job_status, customer_id, provider_id, net_payout, gross_amount, platform_fee
  INTO v_job
  FROM public.jobs
  WHERE id = p_job_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job not found');
  END IF;

  IF v_job.customer_id != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized: you do not own this job');
  END IF;

  IF v_job.job_status != 'awaiting_customer_confirmation' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job is not awaiting confirmation. Current status: ' || v_job.job_status::text);
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.disputes d
    WHERE d.job_id = p_job_id
      AND d.dispute_status IN ('open', 'under_review')
  ) INTO v_active_dispute;

  IF v_active_dispute THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Funds remain in escrow while this job is under dispute.'
    );
  END IF;

  v_expected_net := v_job.gross_amount - v_job.platform_fee;

  IF ABS(v_job.net_payout - v_expected_net) > 0.01 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Provider payout does not match the required 15% platform fee calculation.'
    );
  END IF;

  UPDATE public.jobs
  SET
    job_status = 'completed',
    customer_confirmed_at = now(),
    customer_confirmed_by = v_user_id,
    completed_at = now(),
    updated_at = now()
  WHERE id = p_job_id;

  INSERT INTO public.job_status_history (job_id, from_status, to_status, changed_by, note)
  VALUES (p_job_id, 'awaiting_customer_confirmation', 'completed', v_user_id, 'Customer confirmed completion');

  INSERT INTO public.provider_earnings (provider_id, job_id, gross_amount, platform_fee, net_amount, is_in_escrow, released_at)
  VALUES (v_job.provider_id, p_job_id, v_job.gross_amount, v_job.platform_fee, v_job.net_payout, false, now())
  ON CONFLICT (job_id) DO UPDATE
    SET is_in_escrow = false, released_at = now();

  UPDATE public.provider_profiles
  SET
    total_jobs = total_jobs + 1,
    total_earned = total_earned + v_job.net_payout,
    current_balance = current_balance + v_job.net_payout,
    updated_at = now()
  WHERE user_id = v_job.provider_id;

  UPDATE public.customer_profiles
  SET
    total_jobs = total_jobs + 1,
    total_spent = total_spent + v_job.gross_amount,
    updated_at = now()
  WHERE user_id = v_job.customer_id;

  INSERT INTO public.notifications (user_id, notification_type, title, body, job_id)
  VALUES (
    v_job.provider_id,
    'job_completed',
    'Job Confirmed Complete!',
    'The customer has confirmed your work. Your payout has been processed.',
    p_job_id
  );

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

GRANT EXECUTE ON FUNCTION public.customer_confirm_completion(UUID) TO authenticated;
