-- ============================================================
-- SideHustle — Foundation Schema Migration
-- Phase 1: All tables, RLS, triggers, and seed data
-- ============================================================

-- ============================================================
-- STEP 1: ENUM TYPES
-- ============================================================

DROP TYPE IF EXISTS public.user_role CASCADE;
CREATE TYPE public.user_role AS ENUM ('customer', 'provider', 'admin');

DROP TYPE IF EXISTS public.job_status CASCADE;
CREATE TYPE public.job_status AS ENUM (
  'requested',
  'payment_confirmed',
  'ready_for_assignment',
  'assigned',
  'in_progress',
  'completed',
  'cancelled',
  'disputed'
);

DROP TYPE IF EXISTS public.payment_channel CASCADE;
CREATE TYPE public.payment_channel AS ENUM ('orange_money', 'mtn_momo', 'internal');

DROP TYPE IF EXISTS public.payment_status CASCADE;
CREATE TYPE public.payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');

DROP TYPE IF EXISTS public.payment_type CASCADE;
CREATE TYPE public.payment_type AS ENUM ('customer_payment', 'provider_disbursement', 'platform_fee', 'refund');

DROP TYPE IF EXISTS public.disbursement_status CASCADE;
CREATE TYPE public.disbursement_status AS ENUM ('pending', 'processing', 'completed', 'failed');

DROP TYPE IF EXISTS public.dispute_status CASCADE;
CREATE TYPE public.dispute_status AS ENUM ('open', 'under_review', 'resolved', 'closed');

DROP TYPE IF EXISTS public.notification_type CASCADE;
CREATE TYPE public.notification_type AS ENUM (
  'job_created', 'job_assigned', 'job_started', 'job_completed',
  'payment_confirmed', 'disbursement_processed', 'dispute_raised',
  'provider_joined', 'system'
);

DROP TYPE IF EXISTS public.provider_status CASCADE;
CREATE TYPE public.provider_status AS ENUM ('pending_verification', 'active', 'suspended', 'inactive');

DROP TYPE IF EXISTS public.user_account_status CASCADE;
CREATE TYPE public.user_account_status AS ENUM ('active', 'suspended', 'pending_verification');

-- ============================================================
-- STEP 2: CORE TABLES
-- ============================================================

-- 2.1 User Profiles (intermediary for auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  role public.user_role NOT NULL DEFAULT 'customer',
  account_status public.user_account_status NOT NULL DEFAULT 'active',
  is_verified BOOLEAN NOT NULL DEFAULT false,
  area TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 Service Categories
CREATE TABLE IF NOT EXISTS public.service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  base_price INTEGER NOT NULL DEFAULT 0,
  platform_fee INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'job',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.3 Customer Profiles
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  preferred_area TEXT,
  total_jobs INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.4 Provider Profiles
CREATE TABLE IF NOT EXISTS public.provider_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  service_category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
  service_area TEXT,
  payout_provider public.payment_channel,
  payout_mobile TEXT,
  payout_mobile_verified BOOLEAN NOT NULL DEFAULT false,
  is_available BOOLEAN NOT NULL DEFAULT true,
  provider_status public.provider_status NOT NULL DEFAULT 'pending_verification',
  rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  total_jobs INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  current_balance INTEGER NOT NULL DEFAULT 0,
  escrow_balance INTEGER NOT NULL DEFAULT 0,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.5 Jobs / Service Requests
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  provider_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  service_category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
  service_label TEXT NOT NULL,
  address TEXT NOT NULL,
  area TEXT NOT NULL,
  landmark TEXT,
  scheduled_date DATE NOT NULL,
  scheduled_time TEXT NOT NULL,
  notes TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  gross_amount INTEGER NOT NULL DEFAULT 0,
  platform_fee INTEGER NOT NULL DEFAULT 0,
  net_payout INTEGER NOT NULL DEFAULT 0,
  job_status public.job_status NOT NULL DEFAULT 'requested',
  payment_channel public.payment_channel,
  payment_mobile TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.6 Job Status History
CREATE TABLE IF NOT EXISTS public.job_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  from_status public.job_status,
  to_status public.job_status NOT NULL,
  changed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.7 Payments
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref TEXT NOT NULL UNIQUE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE RESTRICT,
  payer_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  payment_type public.payment_type NOT NULL,
  channel public.payment_channel NOT NULL,
  mobile_number TEXT,
  amount INTEGER NOT NULL DEFAULT 0,
  platform_fee INTEGER NOT NULL DEFAULT 0,
  net_amount INTEGER NOT NULL DEFAULT 0,
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  provider_ref TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.8 Provider Earnings (per-job earnings record)
CREATE TABLE IF NOT EXISTS public.provider_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  gross_amount INTEGER NOT NULL DEFAULT 0,
  platform_fee INTEGER NOT NULL DEFAULT 0,
  net_amount INTEGER NOT NULL DEFAULT 0,
  is_in_escrow BOOLEAN NOT NULL DEFAULT true,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.9 Provider Disbursements
CREATE TABLE IF NOT EXISTS public.provider_disbursements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref TEXT NOT NULL UNIQUE,
  provider_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL DEFAULT 0,
  channel public.payment_channel NOT NULL,
  mobile_number TEXT NOT NULL,
  disbursement_status public.disbursement_status NOT NULL DEFAULT 'pending',
  provider_ref TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.10 Reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL UNIQUE REFERENCES public.jobs(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.11 Disputes
CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  raised_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  dispute_status public.dispute_status NOT NULL DEFAULT 'open',
  resolved_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  resolution_note TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.12 Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  notification_type public.notification_type NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.13 Proof of Work Photos
CREATE TABLE IF NOT EXISTS public.proof_of_work (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STEP 3: INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON public.jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_provider_id ON public.jobs(provider_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(job_status);
CREATE INDEX IF NOT EXISTS idx_jobs_ref ON public.jobs(ref);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_status_history_job_id ON public.job_status_history(job_id);
CREATE INDEX IF NOT EXISTS idx_payments_job_id ON public.payments(job_id);
CREATE INDEX IF NOT EXISTS idx_payments_payer_id ON public.payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_provider_earnings_provider_id ON public.provider_earnings(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_earnings_job_id ON public.provider_earnings(job_id);
CREATE INDEX IF NOT EXISTS idx_provider_disbursements_provider_id ON public.provider_disbursements(provider_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_proof_of_work_job_id ON public.proof_of_work(job_id);
CREATE INDEX IF NOT EXISTS idx_disputes_job_id ON public.disputes(job_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON public.reviews(reviewee_id);

-- ============================================================
-- STEP 4: FUNCTIONS (must be before RLS policies)
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create user profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');

  INSERT INTO public.user_profiles (id, email, full_name, phone, role, account_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    v_role::public.user_role,
    'active'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Auto-create sub-profile based on role
  IF v_role = 'customer' THEN
    INSERT INTO public.customer_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  ELSIF v_role = 'provider' THEN
    INSERT INTO public.provider_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Generate job reference
CREATE OR REPLACE FUNCTION public.generate_job_ref()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_date TEXT;
  v_seq INTEGER;
  v_ref TEXT;
BEGIN
  IF NEW.ref IS NULL OR NEW.ref = '' THEN
    v_date := TO_CHAR(NOW(), 'YYYYMMDD');
    SELECT COUNT(*) + 1 INTO v_seq
    FROM public.jobs
    WHERE created_at::DATE = NOW()::DATE;
    v_ref := 'SH-' || v_date || '-' || LPAD(v_seq::TEXT, 3, '0');
    NEW.ref := v_ref;
  END IF;
  RETURN NEW;
END;
$$;

-- Log job status changes
CREATE OR REPLACE FUNCTION public.log_job_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.job_status IS DISTINCT FROM NEW.job_status THEN
    INSERT INTO public.job_status_history (job_id, from_status, to_status)
    VALUES (NEW.id, OLD.job_status, NEW.job_status);
  END IF;
  RETURN NEW;
END;
$$;

-- Role check helper (safe for non-user_profiles tables)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(raw_user_meta_data->>'role', 'customer')
  FROM auth.users
  WHERE id = auth.uid()
$$;

-- Admin check (uses auth.users metadata — safe for all tables)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (raw_user_meta_data->>'role' = 'admin' OR raw_app_meta_data->>'role' = 'admin')
  )
$$;

-- ============================================================
-- STEP 5: ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_disbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proof_of_work ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 6: RLS POLICIES
-- ============================================================

-- user_profiles: own row + admin full access
DROP POLICY IF EXISTS "users_manage_own_profile" ON public.user_profiles;
CREATE POLICY "users_manage_own_profile"
ON public.user_profiles FOR ALL TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "admin_full_access_user_profiles" ON public.user_profiles;
CREATE POLICY "admin_full_access_user_profiles"
ON public.user_profiles FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- service_categories: public read
DROP POLICY IF EXISTS "public_read_service_categories" ON public.service_categories;
CREATE POLICY "public_read_service_categories"
ON public.service_categories FOR SELECT TO public
USING (true);

DROP POLICY IF EXISTS "admin_manage_service_categories" ON public.service_categories;
CREATE POLICY "admin_manage_service_categories"
ON public.service_categories FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- customer_profiles
DROP POLICY IF EXISTS "customers_manage_own_profile" ON public.customer_profiles;
CREATE POLICY "customers_manage_own_profile"
ON public.customer_profiles FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_full_access_customer_profiles" ON public.customer_profiles;
CREATE POLICY "admin_full_access_customer_profiles"
ON public.customer_profiles FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- provider_profiles: own + admin + customers can read active providers
DROP POLICY IF EXISTS "providers_manage_own_profile" ON public.provider_profiles;
CREATE POLICY "providers_manage_own_profile"
ON public.provider_profiles FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "authenticated_read_active_providers" ON public.provider_profiles;
CREATE POLICY "authenticated_read_active_providers"
ON public.provider_profiles FOR SELECT TO authenticated
USING (provider_status = 'active');

DROP POLICY IF EXISTS "admin_full_access_provider_profiles" ON public.provider_profiles;
CREATE POLICY "admin_full_access_provider_profiles"
ON public.provider_profiles FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- jobs: customer sees own, provider sees assigned + available, admin sees all
DROP POLICY IF EXISTS "customers_manage_own_jobs" ON public.jobs;
CREATE POLICY "customers_manage_own_jobs"
ON public.jobs FOR ALL TO authenticated
USING (customer_id = auth.uid())
WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "providers_view_available_jobs" ON public.jobs;
CREATE POLICY "providers_view_available_jobs"
ON public.jobs FOR SELECT TO authenticated
USING (
  job_status = 'ready_for_assignment'
  OR provider_id = auth.uid()
);

DROP POLICY IF EXISTS "providers_update_assigned_jobs" ON public.jobs;
CREATE POLICY "providers_update_assigned_jobs"
ON public.jobs FOR UPDATE TO authenticated
USING (provider_id = auth.uid())
WITH CHECK (provider_id = auth.uid());

DROP POLICY IF EXISTS "admin_full_access_jobs" ON public.jobs;
CREATE POLICY "admin_full_access_jobs"
ON public.jobs FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- job_status_history: read for involved parties
DROP POLICY IF EXISTS "involved_parties_read_job_history" ON public.job_status_history;
CREATE POLICY "involved_parties_read_job_history"
ON public.job_status_history FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_id
    AND (j.customer_id = auth.uid() OR j.provider_id = auth.uid())
  )
  OR public.is_admin()
);

-- payments
DROP POLICY IF EXISTS "users_view_own_payments" ON public.payments;
CREATE POLICY "users_view_own_payments"
ON public.payments FOR SELECT TO authenticated
USING (payer_id = auth.uid());

DROP POLICY IF EXISTS "users_create_own_payments" ON public.payments;
CREATE POLICY "users_create_own_payments"
ON public.payments FOR INSERT TO authenticated
WITH CHECK (payer_id = auth.uid());

DROP POLICY IF EXISTS "admin_full_access_payments" ON public.payments;
CREATE POLICY "admin_full_access_payments"
ON public.payments FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- provider_earnings
DROP POLICY IF EXISTS "providers_view_own_earnings" ON public.provider_earnings;
CREATE POLICY "providers_view_own_earnings"
ON public.provider_earnings FOR SELECT TO authenticated
USING (provider_id = auth.uid());

DROP POLICY IF EXISTS "admin_full_access_earnings" ON public.provider_earnings;
CREATE POLICY "admin_full_access_earnings"
ON public.provider_earnings FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- provider_disbursements
DROP POLICY IF EXISTS "providers_view_own_disbursements" ON public.provider_disbursements;
CREATE POLICY "providers_view_own_disbursements"
ON public.provider_disbursements FOR SELECT TO authenticated
USING (provider_id = auth.uid());

DROP POLICY IF EXISTS "providers_request_disbursement" ON public.provider_disbursements;
CREATE POLICY "providers_request_disbursement"
ON public.provider_disbursements FOR INSERT TO authenticated
WITH CHECK (provider_id = auth.uid());

DROP POLICY IF EXISTS "admin_full_access_disbursements" ON public.provider_disbursements;
CREATE POLICY "admin_full_access_disbursements"
ON public.provider_disbursements FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- reviews
DROP POLICY IF EXISTS "users_manage_own_reviews" ON public.reviews;
CREATE POLICY "users_manage_own_reviews"
ON public.reviews FOR ALL TO authenticated
USING (reviewer_id = auth.uid())
WITH CHECK (reviewer_id = auth.uid());

DROP POLICY IF EXISTS "public_read_reviews" ON public.reviews;
CREATE POLICY "public_read_reviews"
ON public.reviews FOR SELECT TO public
USING (true);

-- disputes
DROP POLICY IF EXISTS "users_manage_own_disputes" ON public.disputes;
CREATE POLICY "users_manage_own_disputes"
ON public.disputes FOR ALL TO authenticated
USING (raised_by = auth.uid())
WITH CHECK (raised_by = auth.uid());

DROP POLICY IF EXISTS "admin_full_access_disputes" ON public.disputes;
CREATE POLICY "admin_full_access_disputes"
ON public.disputes FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- notifications
DROP POLICY IF EXISTS "users_manage_own_notifications" ON public.notifications;
CREATE POLICY "users_manage_own_notifications"
ON public.notifications FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_full_access_notifications" ON public.notifications;
CREATE POLICY "admin_full_access_notifications"
ON public.notifications FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- proof_of_work
DROP POLICY IF EXISTS "providers_manage_own_proof" ON public.proof_of_work;
CREATE POLICY "providers_manage_own_proof"
ON public.proof_of_work FOR ALL TO authenticated
USING (provider_id = auth.uid())
WITH CHECK (provider_id = auth.uid());

DROP POLICY IF EXISTS "customers_view_job_proof" ON public.proof_of_work;
CREATE POLICY "customers_view_job_proof"
ON public.proof_of_work FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_id AND j.customer_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "admin_full_access_proof" ON public.proof_of_work;
CREATE POLICY "admin_full_access_proof"
ON public.proof_of_work FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================
-- STEP 7: TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS set_updated_at_user_profiles ON public.user_profiles;
CREATE TRIGGER set_updated_at_user_profiles
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_jobs ON public.jobs;
CREATE TRIGGER set_updated_at_jobs
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS generate_job_ref_trigger ON public.jobs;
CREATE TRIGGER generate_job_ref_trigger
  BEFORE INSERT ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.generate_job_ref();

DROP TRIGGER IF EXISTS log_job_status_change_trigger ON public.jobs;
CREATE TRIGGER log_job_status_change_trigger
  AFTER UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.log_job_status_change();

DROP TRIGGER IF EXISTS set_updated_at_provider_profiles ON public.provider_profiles;
CREATE TRIGGER set_updated_at_provider_profiles
  BEFORE UPDATE ON public.provider_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_payments ON public.payments;
CREATE TRIGGER set_updated_at_payments
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_disbursements ON public.provider_disbursements;
CREATE TRIGGER set_updated_at_disbursements
  BEFORE UPDATE ON public.provider_disbursements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- STEP 8: SEED DATA — Service Categories
-- ============================================================

INSERT INTO public.service_categories (slug, label, description, base_price, platform_fee, unit, sort_order)
VALUES
  ('laundry-standard', 'Laundry — Standard Wash', 'Regular wash for everyday clothing', 850, 85, 'bag', 1),
  ('laundry-bulk', 'Laundry — Bulk Wash & Iron', 'Bulk wash with ironing and folding', 1200, 120, 'bag', 2),
  ('laundry-express', 'Laundry — Express Wash', 'Same-day express laundry service', 600, 60, 'bag', 3),
  ('laundry-delicate', 'Laundry — Delicate Care', 'Gentle wash for delicate fabrics', 950, 95, 'bag', 4),
  ('home-cleaning', 'Home Cleaning', 'Full home cleaning service', 1500, 150, 'session', 5),
  ('trades-plumbing', 'Plumbing', 'Plumbing repairs and installations', 2000, 200, 'job', 6),
  ('trades-electrical', 'Electrical', 'Electrical repairs and wiring', 2500, 250, 'job', 7),
  ('errand-delivery', 'Errand & Delivery', 'Errands and local delivery', 500, 50, 'trip', 8)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- STEP 9: SEED DATA — Demo Users
-- ============================================================

DO $$
DECLARE
  v_admin_id UUID := gen_random_uuid();
  v_customer1_id UUID := gen_random_uuid();
  v_customer2_id UUID := gen_random_uuid();
  v_provider1_id UUID := gen_random_uuid();
  v_provider2_id UUID := gen_random_uuid();
  v_cat_standard_id UUID;
  v_cat_bulk_id UUID;
  v_job1_id UUID := gen_random_uuid();
  v_job2_id UUID := gen_random_uuid();
  v_job3_id UUID := gen_random_uuid();
BEGIN
  -- Create auth users (trigger will create user_profiles automatically)
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at, email_change_token_new, email_change,
    email_change_sent_at, email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at, phone, phone_change,
    phone_change_token, phone_change_sent_at
  ) VALUES
    -- Admin
    (v_admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'admin@sidehustle.lr', crypt('Admin@2026', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'SideHustle Admin', 'role', 'admin', 'phone', '+231770000000'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
    -- Customer 1
    (v_customer1_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'fatu.kamara@sidehustle.lr', crypt('Customer@2026', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Fatu Kamara', 'role', 'customer', 'phone', '+231886111222'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
    -- Customer 2
    (v_customer2_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'abigail.konneh@sidehustle.lr', crypt('Customer@2026', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Abigail Konneh', 'role', 'customer', 'phone', '+231886333444'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
    -- Provider 1
    (v_provider1_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'emmanuel.dolo@sidehustle.lr', crypt('Provider@2026', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Emmanuel Dolo', 'role', 'provider', 'phone', '+231886234567'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
    -- Provider 2
    (v_provider2_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'grace.toe@sidehustle.lr', crypt('Provider@2026', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Grace Toe', 'role', 'provider', 'phone', '+231886999000'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null)
  ON CONFLICT (id) DO NOTHING;

  -- Update provider profiles with more details
  UPDATE public.provider_profiles
  SET
    service_area = 'Sinkor, Monrovia',
    payout_provider = 'orange_money',
    payout_mobile = '+231886234567',
    payout_mobile_verified = true,
    is_available = true,
    provider_status = 'active',
    rating = 4.9,
    total_jobs = 12,
    total_earned = 12400,
    current_balance = 3005,
    escrow_balance = 1620
  WHERE user_id = v_provider1_id;

  UPDATE public.provider_profiles
  SET
    service_area = 'Paynesville',
    payout_provider = 'mtn_momo',
    payout_mobile = '+231886999000',
    payout_mobile_verified = true,
    is_available = true,
    provider_status = 'active',
    rating = 4.8,
    total_jobs = 9,
    total_earned = 7300,
    current_balance = 1500,
    escrow_balance = 800
  WHERE user_id = v_provider2_id;

  -- Update user profiles area
  UPDATE public.user_profiles SET area = 'Sinkor, Monrovia', is_verified = true WHERE id = v_provider1_id;
  UPDATE public.user_profiles SET area = 'Paynesville', is_verified = true WHERE id = v_provider2_id;
  UPDATE public.user_profiles SET area = 'Sinkor, Monrovia', is_verified = true WHERE id = v_customer1_id;
  UPDATE public.user_profiles SET area = 'Sinkor, Monrovia', is_verified = true WHERE id = v_customer2_id;
  UPDATE public.user_profiles SET is_verified = true WHERE id = v_admin_id;

  -- Get category IDs
  SELECT id INTO v_cat_standard_id FROM public.service_categories WHERE slug = 'laundry-standard' LIMIT 1;
  SELECT id INTO v_cat_bulk_id FROM public.service_categories WHERE slug = 'laundry-bulk' LIMIT 1;

  -- Seed demo jobs
  INSERT INTO public.jobs (
    id, ref, customer_id, provider_id, service_category_id, service_label,
    address, area, scheduled_date, scheduled_time, notes,
    quantity, gross_amount, platform_fee, net_payout,
    job_status, payment_channel, started_at, completed_at
  ) VALUES
    -- Completed job
    (v_job1_id, 'SH-20260912-001', v_customer1_id, v_provider1_id, v_cat_standard_id,
     'Laundry — Standard Wash', '14 Tubman Blvd, Sinkor', 'Sinkor, Monrovia',
     '2026-09-12', '2:00 PM', '3 bags of mixed clothing. Please handle delicates with care.',
     1, 850, 85, 765, 'completed', 'orange_money',
     '2026-09-12 14:05:00+00', '2026-09-12 16:30:00+00'),
    -- In-progress job
    (v_job2_id, 'SH-20260913-001', v_customer2_id, v_provider1_id, v_cat_bulk_id,
     'Laundry — Bulk Wash & Iron', '7 Carey Street, Central Monrovia', 'Central Monrovia',
     '2026-09-13', '4:30 PM', 'Office uniforms — 5 shirts, 3 trousers. Iron and fold neatly.',
     1, 1200, 120, 1080, 'in_progress', 'mtn_momo',
     '2026-09-13 16:35:00+00', NULL),
    -- Ready for assignment
    (v_job3_id, 'SH-20260913-002', v_customer1_id, NULL, v_cat_standard_id,
     'Laundry — Standard Wash', '22 Old Road, Paynesville', 'Paynesville',
     '2026-09-14', '10:00 AM', 'Just 2 bags. Customer needs it back same day.',
     1, 850, 85, 765, 'ready_for_assignment', 'orange_money', NULL, NULL)
  ON CONFLICT (id) DO NOTHING;

  -- Seed payments for completed job
  INSERT INTO public.payments (ref, job_id, payer_id, payment_type, channel, mobile_number, amount, platform_fee, net_amount, payment_status)
  VALUES
    ('TXN-20260912-001', v_job1_id, v_customer1_id, 'customer_payment', 'orange_money', '+231886111222', 850, 85, 765, 'completed'),
    ('TXN-20260913-001', v_job2_id, v_customer2_id, 'customer_payment', 'mtn_momo', '+231886333444', 1200, 120, 1080, 'completed')
  ON CONFLICT (ref) DO NOTHING;

  -- Seed provider earnings
  INSERT INTO public.provider_earnings (provider_id, job_id, gross_amount, platform_fee, net_amount, is_in_escrow, released_at)
  VALUES
    (v_provider1_id, v_job1_id, 850, 85, 765, false, '2026-09-12 18:00:00+00'),
    (v_provider1_id, v_job2_id, 1200, 120, 1080, true, NULL)
  ON CONFLICT (id) DO NOTHING;

  -- Seed disbursement history
  INSERT INTO public.provider_disbursements (ref, provider_id, amount, channel, mobile_number, disbursement_status, provider_ref)
  VALUES
    ('DIS-20260910-001', v_provider1_id, 3840, 'orange_money', '+231886234567', 'completed', 'OM-20260910-4421'),
    ('DIS-20260905-001', v_provider1_id, 2950, 'mtn_momo', '+231886234567', 'completed', 'MTN-20260905-8812')
  ON CONFLICT (ref) DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Seed data error: %', SQLERRM;
END $$;
