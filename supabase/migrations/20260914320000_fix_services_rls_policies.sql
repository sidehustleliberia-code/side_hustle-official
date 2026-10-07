-- ============================================================
-- Fix: services RLS policies — replace auth.users reference
-- with public.user_profiles to resolve "permission denied for table users"
-- ============================================================

-- Drop and recreate the admin policy for services using user_profiles
DROP POLICY IF EXISTS "services_admin_all" ON public.services;

CREATE POLICY "services_admin_all"
ON public.services FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role = 'admin'
  )
);

-- Also ensure the public read policy covers all rows (including for admin reads)
DROP POLICY IF EXISTS "services_public_read" ON public.services;

CREATE POLICY "services_public_read"
ON public.services FOR SELECT
TO public
USING (true);

-- Fix service_categories admin policy if it also references auth.users
DROP POLICY IF EXISTS "service_categories_admin_all" ON public.service_categories;

CREATE POLICY "service_categories_admin_all"
ON public.service_categories FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role = 'admin'
  )
);
