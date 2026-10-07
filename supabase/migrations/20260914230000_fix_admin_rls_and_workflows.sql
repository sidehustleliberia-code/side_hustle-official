-- ============================================================
-- Fix Admin RLS + Core Workflow Issues
-- 1. Fix is_admin() to check user_profiles.role as fallback
-- 2. Ensure awaiting_customer_confirmation is in job_status enum
-- 3. Add provider_view_job_proof policy for customers
-- ============================================================

-- ============================================================
-- FIX 1: Update is_admin() to check user_profiles.role
-- The previous version only checked auth.users metadata.
-- Admin accounts created directly in Supabase dashboard may not
-- have raw_user_meta_data.role set, causing all admin RLS policies
-- to fail silently and return empty data.
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (
      au.raw_user_meta_data->>'role' = 'admin'
      OR au.raw_app_meta_data->>'role' = 'admin'
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
    AND up.role = 'admin'
  )
$$;

-- ============================================================
-- FIX 2: Ensure awaiting_customer_confirmation exists in enum
-- (Already added by 20260913240000_two_party_completion.sql,
--  but guard here in case it was missed)
-- ============================================================
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

-- ============================================================
-- FIX 3: Ensure provider can also read proof_of_work for their jobs
-- (providers need to see their own uploaded photos)
-- ============================================================
DROP POLICY IF EXISTS "providers_view_own_proof" ON public.proof_of_work;
CREATE POLICY "providers_view_own_proof"
ON public.proof_of_work FOR SELECT TO authenticated
USING (provider_id = auth.uid());

-- ============================================================
-- FIX 4: Allow admin to read all proof_of_work (already exists
-- but recreate to ensure it uses updated is_admin())
-- ============================================================
DROP POLICY IF EXISTS "admin_full_access_proof" ON public.proof_of_work;
CREATE POLICY "admin_full_access_proof"
ON public.proof_of_work FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================
-- FIX 5: Ensure admin can read job_status_history
-- ============================================================
DROP POLICY IF EXISTS "admin_full_access_job_status_history" ON public.job_status_history;
CREATE POLICY "admin_full_access_job_status_history"
ON public.job_status_history FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================
-- FIX 6: Ensure admin can read all jobs (recreate with updated is_admin)
-- ============================================================
DROP POLICY IF EXISTS "admin_full_access_jobs" ON public.jobs;
CREATE POLICY "admin_full_access_jobs"
ON public.jobs FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================
-- FIX 7: Ensure admin can read all user_profiles
-- ============================================================
DROP POLICY IF EXISTS "admin_full_access_user_profiles" ON public.user_profiles;
CREATE POLICY "admin_full_access_user_profiles"
ON public.user_profiles FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================
-- FIX 8: Ensure admin can read all payments
-- ============================================================
DROP POLICY IF EXISTS "admin_full_access_payments" ON public.payments;
CREATE POLICY "admin_full_access_payments"
ON public.payments FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================
-- FIX 9: Ensure admin can read all disputes
-- ============================================================
DROP POLICY IF EXISTS "admin_full_access_disputes" ON public.disputes;
CREATE POLICY "admin_full_access_disputes"
ON public.disputes FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================
-- FIX 10: Ensure admin can read all provider_profiles
-- ============================================================
DROP POLICY IF EXISTS "admin_full_access_provider_profiles" ON public.provider_profiles;
CREATE POLICY "admin_full_access_provider_profiles"
ON public.provider_profiles FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================
-- FIX 11: Ensure admin can read all customer_profiles
-- ============================================================
DROP POLICY IF EXISTS "admin_full_access_customer_profiles" ON public.customer_profiles;
CREATE POLICY "admin_full_access_customer_profiles"
ON public.customer_profiles FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================
-- FIX 12: Ensure admin can read all provider_earnings
-- ============================================================
DROP POLICY IF EXISTS "admin_full_access_earnings" ON public.provider_earnings;
CREATE POLICY "admin_full_access_earnings"
ON public.provider_earnings FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================
-- FIX 13: Ensure admin can read all provider_disbursements
-- ============================================================
DROP POLICY IF EXISTS "admin_full_access_disbursements" ON public.provider_disbursements;
CREATE POLICY "admin_full_access_disbursements"
ON public.provider_disbursements FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================
-- FIX 14: Ensure admin can read all notifications
-- ============================================================
DROP POLICY IF EXISTS "admin_full_access_notifications" ON public.notifications;
CREATE POLICY "admin_full_access_notifications"
ON public.notifications FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================
-- FIX 15: Ensure admin can read all service_categories
-- ============================================================
DROP POLICY IF EXISTS "admin_manage_service_categories" ON public.service_categories;
CREATE POLICY "admin_manage_service_categories"
ON public.service_categories FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================
-- FIX 16: Ensure provider_mark_complete and customer_confirm_completion
-- RPCs are granted to authenticated users
-- ============================================================
GRANT EXECUTE ON FUNCTION public.provider_mark_complete(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_confirm_completion(UUID) TO authenticated;

-- ============================================================
-- FIX 17: Ensure is_admin() is granted to authenticated users
-- ============================================================
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
