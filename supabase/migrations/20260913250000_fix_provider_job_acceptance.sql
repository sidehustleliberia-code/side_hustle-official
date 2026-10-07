-- ============================================================
-- SideHustle — Fix Provider Job Acceptance
-- Resolves:
--   1. RLS policy blocking providers from accepting unassigned jobs
--      (provider_id IS NULL so old USING(provider_id = auth.uid()) fails)
--   2. Race condition: two providers accepting the same job
--      (atomic accept_job RPC with row-level lock)
-- ============================================================

-- ============================================================
-- 1. FIX RLS: providers_update_assigned_jobs
--    Old policy: USING(provider_id = auth.uid()) — blocks accepting
--    unassigned jobs because provider_id IS NULL.
--    New policy: allow UPDATE when the job is ready_for_assignment
--    (accepting it) OR when the provider is already assigned to it.
-- ============================================================

DROP POLICY IF EXISTS "providers_update_assigned_jobs" ON public.jobs;

CREATE POLICY "providers_update_assigned_jobs"
ON public.jobs FOR UPDATE TO authenticated
USING (
  -- Provider can accept an unassigned job that is ready
  (job_status = 'ready_for_assignment' AND provider_id IS NULL)
  -- Provider can update a job they are already assigned to
  OR provider_id = auth.uid()
)
WITH CHECK (
  -- After the update, the provider_id must be the authenticated user
  -- (prevents a provider from assigning the job to someone else)
  provider_id = auth.uid()
);

-- ============================================================
-- 2. ATOMIC accept_job RPC — race-condition safe
--    Uses SELECT ... FOR UPDATE SKIP LOCKED to ensure only one
--    provider can successfully claim a job even under concurrency.
--    Returns: { success: boolean, error?: text }
-- ============================================================

CREATE OR REPLACE FUNCTION public.accept_job(
  p_job_id UUID,
  p_provider_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job RECORD;
  v_provider RECORD;
BEGIN
  -- Verify the caller is the provider they claim to be
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF auth.uid() <> p_provider_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Provider ID mismatch');
  END IF;

  -- Verify provider is active and available
  SELECT is_available, provider_status
  INTO v_provider
  FROM public.provider_profiles
  WHERE user_id = p_provider_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Provider profile not found');
  END IF;

  IF v_provider.provider_status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Provider account is not active');
  END IF;

  IF NOT v_provider.is_available THEN
    RETURN jsonb_build_object('success', false, 'error', 'Provider is offline');
  END IF;

  -- Lock the job row to prevent concurrent acceptance
  SELECT id, job_status, provider_id
  INTO v_job
  FROM public.jobs
  WHERE id = p_job_id
  FOR UPDATE SKIP LOCKED;

  -- If we couldn't lock the row, another transaction is accepting it right now
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job is being claimed by another provider');
  END IF;

  -- Verify the job is still available
  IF v_job.job_status <> 'ready_for_assignment' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job is no longer available');
  END IF;

  IF v_job.provider_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job has already been assigned');
  END IF;

  -- Atomically assign the job
  UPDATE public.jobs
  SET
    provider_id = p_provider_id,
    job_status = 'assigned',
    updated_at = NOW()
  WHERE id = p_job_id
    AND job_status = 'ready_for_assignment'
    AND provider_id IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job was just taken by another provider');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.accept_job(UUID, UUID) TO authenticated;
