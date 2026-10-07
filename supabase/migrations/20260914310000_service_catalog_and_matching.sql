-- ============================================================
-- SideHustle — Service Catalog & Provider Matching
-- Adds: services, provider_services, provider_skills tables
-- Updates: jobs.service_id, seeds full catalog, adds matching RPC
-- ============================================================

-- ============================================================
-- STEP 1: NEW TABLES
-- ============================================================

-- 1.1 Services (specific services under a category)
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.service_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  base_price INTEGER NOT NULL DEFAULT 0,
  platform_fee INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'job',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.2 Provider Services (many-to-many: provider ↔ service)
CREATE TABLE IF NOT EXISTS public.provider_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider_id, service_id)
);

-- 1.3 Provider Skills
CREATE TABLE IF NOT EXISTS public.provider_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider_id, skill_name)
);

-- ============================================================
-- STEP 2: ADD service_id TO jobs (nullable for backward compat)
-- ============================================================

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.services(id) ON DELETE SET NULL;

-- ============================================================
-- STEP 3: INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_services_category_id ON public.services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON public.services(is_active);
CREATE INDEX IF NOT EXISTS idx_provider_services_provider_id ON public.provider_services(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_services_service_id ON public.provider_services(service_id);
CREATE INDEX IF NOT EXISTS idx_provider_skills_provider_id ON public.provider_skills(provider_id);
CREATE INDEX IF NOT EXISTS idx_jobs_service_id ON public.jobs(service_id);

-- ============================================================
-- STEP 4: FUNCTIONS (before RLS)
-- ============================================================

-- 4.1 get_available_jobs_for_provider: returns only jobs matching provider's services
-- Drop existing function first to allow return type change
DROP FUNCTION IF EXISTS public.get_available_jobs_for_provider(UUID);
CREATE OR REPLACE FUNCTION public.get_available_jobs_for_provider(p_provider_id UUID)
RETURNS TABLE (
  id UUID,
  ref TEXT,
  customer_id UUID,
  provider_id UUID,
  service_category_id UUID,
  service_id UUID,
  service_label TEXT,
  address TEXT,
  area TEXT,
  landmark TEXT,
  scheduled_date DATE,
  scheduled_time TEXT,
  notes TEXT,
  quantity INTEGER,
  gross_amount INTEGER,
  platform_fee INTEGER,
  net_payout INTEGER,
  job_status TEXT,
  payment_channel TEXT,
  payment_mobile TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  provider_completed_at TIMESTAMPTZ,
  provider_completed_by UUID,
  customer_confirmed_at TIMESTAMPTZ,
  customer_confirmed_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_provider_status TEXT;
  v_is_available BOOLEAN;
BEGIN
  -- Check provider eligibility
  SELECT pp.provider_status::TEXT, pp.is_available
  INTO v_provider_status, v_is_available
  FROM public.provider_profiles pp
  WHERE pp.user_id = p_provider_id;

  -- Provider must be active and online
  IF v_provider_status IS NULL OR v_provider_status != 'active' OR v_is_available = false THEN
    RETURN;
  END IF;

  -- Return jobs where:
  -- 1. job is ready_for_assignment
  -- 2. job.service_id matches one of provider's registered services
  --    OR job has no service_id (legacy jobs - show to all active providers)
  RETURN QUERY
  SELECT
    j.id, j.ref, j.customer_id, j.provider_id,
    j.service_category_id, j.service_id, j.service_label,
    j.address, j.area, j.landmark,
    j.scheduled_date, j.scheduled_time, j.notes,
    j.quantity, j.gross_amount, j.platform_fee, j.net_payout,
    j.job_status::TEXT, j.payment_channel::TEXT, j.payment_mobile,
    j.started_at, j.completed_at, j.cancelled_at,
    j.provider_completed_at, j.provider_completed_by,
    j.customer_confirmed_at, j.customer_confirmed_by,
    j.created_at, j.updated_at
  FROM public.jobs j
  WHERE j.job_status = 'ready_for_assignment'
    AND j.provider_id IS NULL
    AND (
      j.service_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.provider_services ps
        WHERE ps.provider_id = p_provider_id
          AND ps.service_id = j.service_id
      )
    )
  ORDER BY j.created_at DESC;
END;
$$;

-- 4.2 Updated_at trigger for services
CREATE OR REPLACE FUNCTION public.handle_services_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================
-- STEP 5: ENABLE RLS
-- ============================================================

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_skills ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 6: RLS POLICIES
-- ============================================================

-- services: public read for active, admin write
DROP POLICY IF EXISTS "services_public_read" ON public.services;
CREATE POLICY "services_public_read"
ON public.services FOR SELECT
TO public
USING (is_active = true);

DROP POLICY IF EXISTS "services_admin_all" ON public.services;
CREATE POLICY "services_admin_all"
ON public.services FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
      AND (au.raw_user_meta_data->>'role' = 'admin' OR au.raw_app_meta_data->>'role' = 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
      AND (au.raw_user_meta_data->>'role' = 'admin' OR au.raw_app_meta_data->>'role' = 'admin')
  )
);

-- provider_services: providers manage their own, public read
DROP POLICY IF EXISTS "provider_services_own_manage" ON public.provider_services;
CREATE POLICY "provider_services_own_manage"
ON public.provider_services FOR ALL
TO authenticated
USING (provider_id = auth.uid())
WITH CHECK (provider_id = auth.uid());

DROP POLICY IF EXISTS "provider_services_public_read" ON public.provider_services;
CREATE POLICY "provider_services_public_read"
ON public.provider_services FOR SELECT
TO authenticated
USING (true);

-- provider_skills: providers manage their own, public read
DROP POLICY IF EXISTS "provider_skills_own_manage" ON public.provider_skills;
CREATE POLICY "provider_skills_own_manage"
ON public.provider_skills FOR ALL
TO authenticated
USING (provider_id = auth.uid())
WITH CHECK (provider_id = auth.uid());

DROP POLICY IF EXISTS "provider_skills_public_read" ON public.provider_skills;
CREATE POLICY "provider_skills_public_read"
ON public.provider_skills FOR SELECT
TO authenticated
USING (true);

-- ============================================================
-- STEP 7: TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS services_updated_at ON public.services;
CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.handle_services_updated_at();

-- ============================================================
-- STEP 8: SEED FULL SERVICE CATALOG
-- ============================================================

DO $$
DECLARE
  v_cat_education UUID;
  v_cat_cleaning UUID;
  v_cat_photography UUID;
  v_cat_technology UUID;
  v_cat_errands UUID;
  v_cat_repairs UUID;
  v_cat_personal UUID;
  v_cat_events UUID;
BEGIN
  -- Get existing category IDs by slug
  SELECT id INTO v_cat_education FROM public.service_categories WHERE slug LIKE '%education%' OR label ILIKE '%education%' OR label ILIKE '%tutor%' LIMIT 1;
  SELECT id INTO v_cat_cleaning FROM public.service_categories WHERE slug LIKE '%clean%' OR label ILIKE '%clean%' OR label ILIKE '%laundry%' LIMIT 1;
  SELECT id INTO v_cat_photography FROM public.service_categories WHERE slug LIKE '%photo%' OR label ILIKE '%photo%' OR label ILIKE '%creative%' LIMIT 1;
  SELECT id INTO v_cat_technology FROM public.service_categories WHERE slug LIKE '%tech%' OR label ILIKE '%tech%' OR label ILIKE '%digital%' LIMIT 1;
  SELECT id INTO v_cat_errands FROM public.service_categories WHERE slug LIKE '%errand%' OR label ILIKE '%errand%' OR label ILIKE '%assist%' LIMIT 1;
  SELECT id INTO v_cat_repairs FROM public.service_categories WHERE slug LIKE '%repair%' OR label ILIKE '%repair%' OR label ILIKE '%trade%' LIMIT 1;
  SELECT id INTO v_cat_personal FROM public.service_categories WHERE slug LIKE '%personal%' OR label ILIKE '%personal%' OR label ILIKE '%lifestyle%' LIMIT 1;
  SELECT id INTO v_cat_events FROM public.service_categories WHERE slug LIKE '%event%' OR label ILIKE '%event%' OR label ILIKE '%occasion%' LIMIT 1;

  -- If categories don't exist with matching slugs, upsert them
  IF v_cat_education IS NULL THEN
    INSERT INTO public.service_categories (slug, label, description, base_price, platform_fee, unit, is_active, sort_order)
    VALUES ('education-tutoring', 'Education & Tutoring', 'Academic support and tutoring services', 500, 75, 'session', true, 1)
    ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label
    RETURNING id INTO v_cat_education;
  END IF;

  IF v_cat_cleaning IS NULL THEN
    INSERT INTO public.service_categories (slug, label, description, base_price, platform_fee, unit, is_active, sort_order)
    VALUES ('cleaning-laundry', 'Cleaning & Laundry', 'Home, office, and laundry cleaning services', 800, 120, 'job', true, 2)
    ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label
    RETURNING id INTO v_cat_cleaning;
  END IF;

  IF v_cat_photography IS NULL THEN
    INSERT INTO public.service_categories (slug, label, description, base_price, platform_fee, unit, is_active, sort_order)
    VALUES ('photography-creative', 'Photography & Creative', 'Photography, videography, and design services', 1500, 225, 'job', true, 3)
    ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label
    RETURNING id INTO v_cat_photography;
  END IF;

  IF v_cat_technology IS NULL THEN
    INSERT INTO public.service_categories (slug, label, description, base_price, platform_fee, unit, is_active, sort_order)
    VALUES ('technology-digital', 'Technology & Digital', 'Web, software, and digital services', 2000, 300, 'job', true, 4)
    ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label
    RETURNING id INTO v_cat_technology;
  END IF;

  IF v_cat_errands IS NULL THEN
    INSERT INTO public.service_categories (slug, label, description, base_price, platform_fee, unit, is_active, sort_order)
    VALUES ('errands-assistance', 'Errands & Assistance', 'Personal errands and assistance tasks', 400, 60, 'job', true, 5)
    ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label
    RETURNING id INTO v_cat_errands;
  END IF;

  IF v_cat_repairs IS NULL THEN
    INSERT INTO public.service_categories (slug, label, description, base_price, platform_fee, unit, is_active, sort_order)
    VALUES ('repairs-skilled-trades', 'Repairs & Skilled Trades', 'Plumbing, electrical, carpentry, and repair services', 1200, 180, 'job', true, 6)
    ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label
    RETURNING id INTO v_cat_repairs;
  END IF;

  IF v_cat_personal IS NULL THEN
    INSERT INTO public.service_categories (slug, label, description, base_price, platform_fee, unit, is_active, sort_order)
    VALUES ('personal-lifestyle', 'Personal & Lifestyle', 'Hair, beauty, tailoring, and personal care', 700, 105, 'session', true, 7)
    ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label
    RETURNING id INTO v_cat_personal;
  END IF;

  IF v_cat_events IS NULL THEN
    INSERT INTO public.service_categories (slug, label, description, base_price, platform_fee, unit, is_active, sort_order)
    VALUES ('events-occasions', 'Events & Occasions', 'Event planning, decoration, and entertainment', 2500, 375, 'event', true, 8)
    ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label
    RETURNING id INTO v_cat_events;
  END IF;

  -- ── EDUCATION & TUTORING services ──
  INSERT INTO public.services (category_id, name, description, base_price, platform_fee, unit, is_active, sort_order) VALUES
    (v_cat_education, 'Mathematics Tutoring', 'One-on-one math tutoring sessions', 500, 75, 'session', true, 1),
    (v_cat_education, 'English Tutoring', 'English language and literature tutoring', 500, 75, 'session', true, 2),
    (v_cat_education, 'Science Tutoring', 'Physics, chemistry, and biology tutoring', 500, 75, 'session', true, 3),
    (v_cat_education, 'Computer Literacy', 'Basic computer skills and digital literacy', 600, 90, 'session', true, 4),
    (v_cat_education, 'Programming Tutoring', 'Coding and software development tutoring', 800, 120, 'session', true, 5),
    (v_cat_education, 'Exam Preparation', 'WAEC, SAT, and other exam prep', 600, 90, 'session', true, 6),
    (v_cat_education, 'Homework Assistance', 'Help with school assignments and homework', 400, 60, 'session', true, 7),
    (v_cat_education, 'Language Tutoring', 'French, Spanish, and other language tutoring', 500, 75, 'session', true, 8)
  ON CONFLICT DO NOTHING;

  -- ── CLEANING & LAUNDRY services ──
  INSERT INTO public.services (category_id, name, description, base_price, platform_fee, unit, is_active, sort_order) VALUES
    (v_cat_cleaning, 'Laundry', 'Standard wash and fold laundry service', 800, 120, 'load', true, 1),
    (v_cat_cleaning, 'Ironing', 'Professional clothes ironing service', 500, 75, 'load', true, 2),
    (v_cat_cleaning, 'House Cleaning', 'Regular home cleaning service', 1200, 180, 'job', true, 3),
    (v_cat_cleaning, 'Deep Cleaning', 'Thorough deep cleaning of entire home', 2500, 375, 'job', true, 4),
    (v_cat_cleaning, 'Office Cleaning', 'Commercial office cleaning service', 1500, 225, 'job', true, 5),
    (v_cat_cleaning, 'Yard Cleaning', 'Outdoor yard and garden cleaning', 1000, 150, 'job', true, 6),
    (v_cat_cleaning, 'Move-in/Move-out Cleaning', 'Cleaning for property transitions', 3000, 450, 'job', true, 7)
  ON CONFLICT DO NOTHING;

  -- ── PHOTOGRAPHY & CREATIVE services ──
  INSERT INTO public.services (category_id, name, description, base_price, platform_fee, unit, is_active, sort_order) VALUES
    (v_cat_photography, 'Photography', 'General photography services', 2000, 300, 'session', true, 1),
    (v_cat_photography, 'Event Photography', 'Photography for events and occasions', 5000, 750, 'event', true, 2),
    (v_cat_photography, 'Portrait Photography', 'Professional portrait and headshot photography', 2500, 375, 'session', true, 3),
    (v_cat_photography, 'Product Photography', 'Photography for products and e-commerce', 3000, 450, 'session', true, 4),
    (v_cat_photography, 'Videography', 'Professional video recording services', 4000, 600, 'session', true, 5),
    (v_cat_photography, 'Photo Editing', 'Professional photo retouching and editing', 1000, 150, 'job', true, 6),
    (v_cat_photography, 'Video Editing', 'Professional video editing and post-production', 2000, 300, 'job', true, 7),
    (v_cat_photography, 'Graphic Design', 'Custom graphic design services', 1500, 225, 'job', true, 8),
    (v_cat_photography, 'Logo Design', 'Professional logo and brand identity design', 2500, 375, 'job', true, 9),
    (v_cat_photography, 'Flyer Design', 'Event and promotional flyer design', 800, 120, 'job', true, 10),
    (v_cat_photography, 'Social Media Content', 'Social media graphics and content creation', 1200, 180, 'job', true, 11)
  ON CONFLICT DO NOTHING;

  -- ── TECHNOLOGY & DIGITAL services ──
  INSERT INTO public.services (category_id, name, description, base_price, platform_fee, unit, is_active, sort_order) VALUES
    (v_cat_technology, 'Web Development', 'Custom website development', 10000, 1500, 'project', true, 1),
    (v_cat_technology, 'Web Design', 'Website UI/UX design', 7000, 1050, 'project', true, 2),
    (v_cat_technology, 'UI/UX Design', 'User interface and experience design', 8000, 1200, 'project', true, 3),
    (v_cat_technology, 'Software Development', 'Custom software and app development', 15000, 2250, 'project', true, 4),
    (v_cat_technology, 'Computer Setup', 'Computer installation and configuration', 1000, 150, 'job', true, 5),
    (v_cat_technology, 'Computer Troubleshooting', 'Diagnosing and fixing computer issues', 800, 120, 'job', true, 6),
    (v_cat_technology, 'Data Entry', 'Accurate data entry and management', 600, 90, 'hour', true, 7),
    (v_cat_technology, 'Microsoft Office Assistance', 'Help with Word, Excel, PowerPoint', 500, 75, 'hour', true, 8),
    (v_cat_technology, 'CV/Resume Design', 'Professional CV and resume creation', 1200, 180, 'job', true, 9),
    (v_cat_technology, 'Presentation Design', 'Professional slide deck design', 1500, 225, 'job', true, 10),
    (v_cat_technology, 'Digital Marketing', 'Online marketing and advertising', 5000, 750, 'month', true, 11),
    (v_cat_technology, 'Social Media Management', 'Managing social media accounts', 3000, 450, 'month', true, 12)
  ON CONFLICT DO NOTHING;

  -- ── ERRANDS & ASSISTANCE services ──
  INSERT INTO public.services (category_id, name, description, base_price, platform_fee, unit, is_active, sort_order) VALUES
    (v_cat_errands, 'Grocery Shopping', 'Shopping for groceries and household items', 400, 60, 'trip', true, 1),
    (v_cat_errands, 'Pick-up/Drop-off', 'Item or document pick-up and delivery', 500, 75, 'trip', true, 2),
    (v_cat_errands, 'Document Delivery', 'Secure document delivery service', 400, 60, 'trip', true, 3),
    (v_cat_errands, 'Shopping Assistance', 'Personal shopping helper', 600, 90, 'hour', true, 4),
    (v_cat_errands, 'Queue Assistance', 'Standing in queues on your behalf', 500, 75, 'hour', true, 5),
    (v_cat_errands, 'Personal Assistant Tasks', 'General personal assistant services', 700, 105, 'hour', true, 6),
    (v_cat_errands, 'Event Errands', 'Running errands for events', 600, 90, 'job', true, 7)
  ON CONFLICT DO NOTHING;

  -- ── REPAIRS & SKILLED TRADES services ──
  INSERT INTO public.services (category_id, name, description, base_price, platform_fee, unit, is_active, sort_order) VALUES
    (v_cat_repairs, 'Plumbing', 'Pipe repair, installation, and plumbing services', 1500, 225, 'job', true, 1),
    (v_cat_repairs, 'Electrical Work', 'Wiring, installation, and electrical repairs', 2000, 300, 'job', true, 2),
    (v_cat_repairs, 'Carpentry', 'Wood work, furniture, and carpentry services', 1500, 225, 'job', true, 3),
    (v_cat_repairs, 'Painting', 'Interior and exterior painting services', 2000, 300, 'job', true, 4),
    (v_cat_repairs, 'Welding', 'Metal welding and fabrication', 2500, 375, 'job', true, 5),
    (v_cat_repairs, 'Masonry', 'Bricklaying and masonry work', 3000, 450, 'job', true, 6),
    (v_cat_repairs, 'Furniture Assembly', 'Assembling flat-pack and other furniture', 800, 120, 'job', true, 7),
    (v_cat_repairs, 'Appliance Repair', 'Fixing household appliances', 1200, 180, 'job', true, 8),
    (v_cat_repairs, 'Generator Servicing', 'Generator maintenance and repair', 2000, 300, 'job', true, 9),
    (v_cat_repairs, 'Phone Repair', 'Smartphone and tablet repair', 1000, 150, 'job', true, 10),
    (v_cat_repairs, 'Computer Repair', 'Laptop and desktop hardware repair', 1500, 225, 'job', true, 11)
  ON CONFLICT DO NOTHING;

  -- ── PERSONAL & LIFESTYLE services ──
  INSERT INTO public.services (category_id, name, description, base_price, platform_fee, unit, is_active, sort_order) VALUES
    (v_cat_personal, 'Hair Styling', 'Professional hair styling services', 800, 120, 'session', true, 1),
    (v_cat_personal, 'Braiding', 'Hair braiding and weaving', 1200, 180, 'session', true, 2),
    (v_cat_personal, 'Makeup', 'Professional makeup application', 1500, 225, 'session', true, 3),
    (v_cat_personal, 'Nail Services', 'Manicure, pedicure, and nail art', 700, 105, 'session', true, 4),
    (v_cat_personal, 'Barbering', 'Professional haircut and grooming', 500, 75, 'session', true, 5),
    (v_cat_personal, 'Tailoring', 'Custom clothing design and tailoring', 2000, 300, 'job', true, 6),
    (v_cat_personal, 'Clothing Alterations', 'Adjusting and altering existing clothes', 800, 120, 'job', true, 7)
  ON CONFLICT DO NOTHING;

  -- ── EVENTS & OCCASIONS services ──
  INSERT INTO public.services (category_id, name, description, base_price, platform_fee, unit, is_active, sort_order) VALUES
    (v_cat_events, 'Event Photography', 'Photography coverage for events', 5000, 750, 'event', true, 1),
    (v_cat_events, 'Videography', 'Video coverage for events', 6000, 900, 'event', true, 2),
    (v_cat_events, 'Event Decoration', 'Venue decoration and setup', 5000, 750, 'event', true, 3),
    (v_cat_events, 'Event Setup', 'Physical setup and arrangement for events', 3000, 450, 'event', true, 4),
    (v_cat_events, 'Catering', 'Food preparation and catering services', 8000, 1200, 'event', true, 5),
    (v_cat_events, 'Baking', 'Custom cakes and baked goods', 2000, 300, 'order', true, 6),
    (v_cat_events, 'MC Services', 'Master of ceremonies for events', 4000, 600, 'event', true, 7),
    (v_cat_events, 'DJ Services', 'Music and DJ services for events', 5000, 750, 'event', true, 8),
    (v_cat_events, 'Event Cleanup', 'Post-event cleaning and teardown', 2000, 300, 'event', true, 9),
    (v_cat_events, 'Event Planning', 'Full event planning and coordination', 10000, 1500, 'event', true, 10),
    (v_cat_events, 'Invitation Design', 'Custom event invitation design', 1000, 150, 'job', true, 11)
  ON CONFLICT DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Service catalog seeding error: %', SQLERRM;
END $$;
