-- Migration: Ensure admin role check works correctly
-- This migration updates the is_admin() function to check user_profiles.role
-- and ensures admin RLS policies are in place

-- Drop and recreate is_admin() to check user_profiles.role as primary source
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_role text;
BEGIN
  -- Check user_profiles.role first (most reliable for manually created admin accounts)
  SELECT role INTO v_role
  FROM public.user_profiles
  WHERE id = auth.uid();

  IF v_role = 'admin' THEN
    RETURN true;
  END IF;

  -- Fallback: check JWT metadata (for accounts created via API with role set)
  IF (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' THEN
    RETURN true;
  END IF;

  IF (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- Ensure admin can read all user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_profiles'
    AND policyname = 'admin_read_all_profiles'
  ) THEN
    CREATE POLICY admin_read_all_profiles ON public.user_profiles
      FOR SELECT TO authenticated
      USING (is_admin());
  END IF;
END $$;

-- Ensure admin can read all jobs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'jobs'
    AND policyname = 'admin_read_all_jobs'
  ) THEN
    CREATE POLICY admin_read_all_jobs ON public.jobs
      FOR SELECT TO authenticated
      USING (is_admin());
  END IF;
END $$;

-- Ensure admin can read all payments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'payments'
    AND policyname = 'admin_read_all_payments'
  ) THEN
    CREATE POLICY admin_read_all_payments ON public.payments
      FOR SELECT TO authenticated
      USING (is_admin());
  END IF;
END $$;

-- Ensure admin can read all disputes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'disputes'
    AND policyname = 'admin_read_all_disputes'
  ) THEN
    CREATE POLICY admin_read_all_disputes ON public.disputes
      FOR SELECT TO authenticated
      USING (is_admin());
  END IF;
END $$;

-- Ensure admin can read all provider_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_profiles'
    AND policyname = 'admin_read_all_provider_profiles'
  ) THEN
    CREATE POLICY admin_read_all_provider_profiles ON public.provider_profiles
      FOR SELECT TO authenticated
      USING (is_admin());
  END IF;
END $$;

-- Ensure admin can update user_profiles (for status changes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_profiles'
    AND policyname = 'admin_update_profiles'
  ) THEN
    CREATE POLICY admin_update_profiles ON public.user_profiles
      FOR UPDATE TO authenticated
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END $$;

-- Ensure admin can update jobs (for assignments)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'jobs'
    AND policyname = 'admin_update_jobs'
  ) THEN
    CREATE POLICY admin_update_jobs ON public.jobs
      FOR UPDATE TO authenticated
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END $$;

-- Ensure admin can update payments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'payments'
    AND policyname = 'admin_update_payments'
  ) THEN
    CREATE POLICY admin_update_payments ON public.payments
      FOR UPDATE TO authenticated
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END $$;

-- Ensure admin can update disputes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'disputes'
    AND policyname = 'admin_update_disputes'
  ) THEN
    CREATE POLICY admin_update_disputes ON public.disputes
      FOR UPDATE TO authenticated
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END $$;

-- Ensure admin can update provider_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'provider_profiles'
    AND policyname = 'admin_update_provider_profiles'
  ) THEN
    CREATE POLICY admin_update_provider_profiles ON public.provider_profiles
      FOR UPDATE TO authenticated
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END $$;
