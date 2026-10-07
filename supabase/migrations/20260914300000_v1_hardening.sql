-- ============================================================
-- Side Hustle V1 Hardening Migration
-- Timestamp: 20260914300000
-- ============================================================

-- ============================================================
-- 1. Support Requests Table (Help & Support)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  admin_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_requests_user_id ON public.support_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_support_requests_status ON public.support_requests(status);
CREATE INDEX IF NOT EXISTS idx_support_requests_created_at ON public.support_requests(created_at DESC);

ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_create_own_support_requests" ON public.support_requests;
CREATE POLICY "users_create_own_support_requests"
ON public.support_requests
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "users_view_own_support_requests" ON public.support_requests;
CREATE POLICY "users_view_own_support_requests"
ON public.support_requests
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_manage_support_requests" ON public.support_requests;
CREATE POLICY "admin_manage_support_requests"
ON public.support_requests
FOR ALL
TO authenticated
USING (public.is_admin());

-- ============================================================
-- 2. Service Categories — ensure admin can manage
-- ============================================================
DROP POLICY IF EXISTS "admin_manage_service_categories" ON public.service_categories;
CREATE POLICY "admin_manage_service_categories"
ON public.service_categories
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================
-- 3. Provider Verification — enforce via DB function
-- ============================================================
-- Function: check if a provider is eligible to receive jobs
CREATE OR REPLACE FUNCTION public.provider_is_eligible(p_provider_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.provider_profiles pp
    WHERE pp.user_id = p_provider_id
      AND pp.provider_status = 'active'
      AND pp.is_available = true
  );
$$;

-- Update accept_job RPC to enforce provider eligibility
CREATE OR REPLACE FUNCTION public.accept_job(p_job_id UUID, p_provider_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job RECORD;
  v_provider RECORD;
BEGIN
  -- Check provider eligibility
  SELECT provider_status, is_available
  INTO v_provider
  FROM public.provider_profiles
  WHERE user_id = p_provider_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Provider profile not found');
  END IF;

  IF v_provider.provider_status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Provider account is not active. Please complete verification.');
  END IF;

  IF NOT v_provider.is_available THEN
    RETURN jsonb_build_object('success', false, 'error', 'Provider is currently offline. Go online to accept jobs.');
  END IF;

  -- Lock the job row to prevent race conditions
  SELECT id, job_status, provider_id
  INTO v_job
  FROM public.jobs
  WHERE id = p_job_id
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job is no longer available (already taken).');
  END IF;

  IF v_job.job_status != 'ready_for_assignment' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job is no longer available for assignment.');
  END IF;

  IF v_job.provider_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job has already been assigned to another provider.');
  END IF;

  -- Assign the job
  UPDATE public.jobs
  SET
    provider_id = p_provider_id,
    job_status = 'assigned',
    updated_at = now()
  WHERE id = p_job_id;

  -- Record status history
  INSERT INTO public.job_status_history (job_id, from_status, to_status, changed_by, note)
  VALUES (p_job_id, 'ready_for_assignment', 'assigned', p_provider_id, 'Provider accepted job');

  RETURN jsonb_build_object('success', true);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================
-- 4. Admin Analytics Function
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_admin_analytics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_total_customers INT;
  v_total_providers INT;
  v_active_providers INT;
  v_total_jobs INT;
  v_active_jobs INT;
  v_completed_jobs INT;
  v_cancelled_jobs INT;
  v_disputed_jobs INT;
  v_gross_value BIGINT;
  v_platform_revenue BIGINT;
  v_provider_share BIGINT;
  v_pending_held BIGINT;
  v_disbursed BIGINT;
  v_open_disputes INT;
  v_avg_transaction NUMERIC;
BEGIN
  SELECT COUNT(*) INTO v_total_customers FROM public.user_profiles WHERE role = 'customer';
  SELECT COUNT(*) INTO v_total_providers FROM public.user_profiles WHERE role = 'provider';
  SELECT COUNT(*) INTO v_active_providers FROM public.provider_profiles WHERE provider_status = 'active';
  SELECT COUNT(*) INTO v_total_jobs FROM public.jobs;
  SELECT COUNT(*) INTO v_active_jobs FROM public.jobs WHERE job_status IN ('requested','payment_confirmed','ready_for_assignment','assigned','in_progress','awaiting_customer_confirmation');
  SELECT COUNT(*) INTO v_completed_jobs FROM public.jobs WHERE job_status = 'completed';
  SELECT COUNT(*) INTO v_cancelled_jobs FROM public.jobs WHERE job_status = 'cancelled';
  SELECT COUNT(*) INTO v_disputed_jobs FROM public.jobs WHERE job_status = 'disputed';
  SELECT COUNT(*) INTO v_open_disputes FROM public.disputes WHERE dispute_status IN ('open','under_review');

  SELECT
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(platform_fee), 0),
    COALESCE(SUM(net_amount), 0)
  INTO v_gross_value, v_platform_revenue, v_provider_share
  FROM public.payments
  WHERE payment_type = 'customer_payment' AND payment_status = 'completed';

  SELECT COALESCE(SUM(amount), 0) INTO v_pending_held
  FROM public.payments
  WHERE payment_type = 'customer_payment' AND payment_status IN ('pending','processing');

  SELECT COALESCE(SUM(amount), 0) INTO v_disbursed
  FROM public.provider_disbursements
  WHERE disbursement_status = 'completed';

  IF v_completed_jobs > 0 THEN
    v_avg_transaction := v_gross_value::NUMERIC / v_completed_jobs;
  ELSE
    v_avg_transaction := 0;
  END IF;

  v_result := jsonb_build_object(
    'totalCustomers', v_total_customers,
    'totalProviders', v_total_providers,
    'activeProviders', v_active_providers,
    'totalJobs', v_total_jobs,
    'activeJobs', v_active_jobs,
    'completedJobs', v_completed_jobs,
    'cancelledJobs', v_cancelled_jobs,
    'disputedJobs', v_disputed_jobs,
    'openDisputes', v_open_disputes,
    'grossTransactionValue', v_gross_value,
    'platformRevenue', v_platform_revenue,
    'providerShare', v_provider_share,
    'pendingHeld', v_pending_held,
    'disbursed', v_disbursed,
    'avgTransactionValue', v_avg_transaction
  );

  RETURN v_result;
END;
$$;

-- ============================================================
-- 5. Provider Verification Admin Actions
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_verify_provider(p_provider_user_id UUID, p_action TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_status TEXT;
BEGIN
  -- Only admins can call this
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  IF p_action = 'approve' THEN
    v_new_status := 'active';
    UPDATE public.provider_profiles SET provider_status = 'active', updated_at = now() WHERE user_id = p_provider_user_id;
    UPDATE public.user_profiles SET is_verified = true, account_status = 'active', updated_at = now() WHERE id = p_provider_user_id;
  ELSIF p_action = 'reject' THEN
    v_new_status := 'inactive';
    UPDATE public.provider_profiles SET provider_status = 'inactive', updated_at = now() WHERE user_id = p_provider_user_id;
    UPDATE public.user_profiles SET account_status = 'suspended', updated_at = now() WHERE id = p_provider_user_id;
  ELSIF p_action = 'suspend' THEN
    v_new_status := 'suspended';
    UPDATE public.provider_profiles SET provider_status = 'suspended', updated_at = now() WHERE user_id = p_provider_user_id;
    UPDATE public.user_profiles SET account_status = 'suspended', updated_at = now() WHERE id = p_provider_user_id;
  ELSIF p_action = 'reactivate' THEN
    v_new_status := 'active';
    UPDATE public.provider_profiles SET provider_status = 'active', updated_at = now() WHERE user_id = p_provider_user_id;
    UPDATE public.user_profiles SET account_status = 'active', updated_at = now() WHERE id = p_provider_user_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action');
  END IF;

  RETURN jsonb_build_object('success', true, 'newStatus', v_new_status);
END;
$$;

-- ============================================================
-- 6. Customer profile update function (self-service, safe fields only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_customer_profile(
  p_full_name TEXT,
  p_phone TEXT,
  p_area TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_profiles
  SET
    full_name = COALESCE(p_full_name, full_name),
    phone = COALESCE(p_phone, phone),
    area = COALESCE(p_area, area),
    updated_at = now()
  WHERE id = auth.uid();

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================
-- 7. Provider profile update function (safe fields only, no admin fields)
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_provider_profile_safe(
  p_full_name TEXT,
  p_phone TEXT,
  p_area TEXT,
  p_service_area TEXT,
  p_bio TEXT,
  p_payout_provider TEXT,
  p_payout_mobile TEXT,
  p_service_category_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update user_profiles (safe fields)
  UPDATE public.user_profiles
  SET
    full_name = COALESCE(p_full_name, full_name),
    phone = COALESCE(p_phone, phone),
    area = COALESCE(p_area, area),
    updated_at = now()
  WHERE id = auth.uid();

  -- Update provider_profiles (safe fields only — NOT provider_status, NOT is_verified)
  UPDATE public.provider_profiles
  SET
    service_area = COALESCE(p_service_area, service_area),
    bio = COALESCE(p_bio, bio),
    payout_provider = COALESCE(p_payout_provider::public.payment_channel, payout_provider),
    payout_mobile = COALESCE(p_payout_mobile, payout_mobile),
    service_category_id = COALESCE(p_service_category_id, service_category_id),
    updated_at = now()
  WHERE user_id = auth.uid();

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
