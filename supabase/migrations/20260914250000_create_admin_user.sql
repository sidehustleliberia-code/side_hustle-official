-- Migration: Create admin user account
-- Creates a real admin auth user and corresponding user_profile row
-- Admin credentials: admin@sidehustle.lr / Admin@SideHustle2026

DO $$
DECLARE
  v_admin_id UUID;
  v_existing_id UUID;
BEGIN
  -- Check if admin user already exists in auth.users
  SELECT id INTO v_existing_id
  FROM auth.users
  WHERE email = 'admin@sidehustle.lr'
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Admin auth user exists — ensure user_profiles row has role = 'admin'
    INSERT INTO public.user_profiles (id, email, full_name, role, account_status, is_verified)
    VALUES (
      v_existing_id,
      'admin@sidehustle.lr',
      'SideHustle Admin',
      'admin'::public.user_role,
      'active'::public.user_account_status,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET role = 'admin'::public.user_role,
          account_status = 'active'::public.user_account_status,
          is_verified = true,
          full_name = COALESCE(NULLIF(public.user_profiles.full_name, ''), 'SideHustle Admin'),
          updated_at = now();

    RAISE NOTICE 'Admin user_profiles row ensured for existing auth user: %', v_existing_id;
  ELSE
    -- Create new admin auth user
    v_admin_id := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      is_sso_user, is_anonymous,
      confirmation_token, confirmation_sent_at,
      recovery_token, recovery_sent_at,
      email_change_token_new, email_change, email_change_sent_at,
      email_change_token_current, email_change_confirm_status,
      reauthentication_token, reauthentication_sent_at,
      phone, phone_change, phone_change_token, phone_change_sent_at
    ) VALUES (
      v_admin_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'admin@sidehustle.lr',
      crypt('Admin@SideHustle2026', gen_salt('bf', 10)),
      now(), now(), now(),
      jsonb_build_object('full_name', 'SideHustle Admin', 'role', 'admin'),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
      false, false,
      '', null, '', null, '', '', null, '', 0, '', null,
      null, '', '', null
    )
    ON CONFLICT (id) DO NOTHING;

    -- Create user_profiles row (trigger may not fire for direct inserts in some setups)
    INSERT INTO public.user_profiles (id, email, full_name, role, account_status, is_verified)
    VALUES (
      v_admin_id,
      'admin@sidehustle.lr',
      'SideHustle Admin',
      'admin'::public.user_role,
      'active'::public.user_account_status,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET role = 'admin'::public.user_role,
          account_status = 'active'::public.user_account_status,
          is_verified = true,
          updated_at = now();

    -- Also handle ON CONFLICT on email unique constraint
    -- (in case trigger already created a row with different id)
    INSERT INTO public.user_profiles (id, email, full_name, role, account_status, is_verified)
    VALUES (
      v_admin_id,
      'admin@sidehustle.lr',
      'SideHustle Admin',
      'admin'::public.user_role,
      'active'::public.user_account_status,
      true
    )
    ON CONFLICT (email) DO UPDATE
      SET role = 'admin'::public.user_role,
          account_status = 'active'::public.user_account_status,
          is_verified = true,
          updated_at = now();

    RAISE NOTICE 'Admin user created with id: %', v_admin_id;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Admin user creation encountered an issue: %. Attempting profile-only upsert.', SQLERRM;
    -- Fallback: if auth insert failed, try to promote any existing user_profiles row by email
    UPDATE public.user_profiles
    SET role = 'admin'::public.user_role,
        account_status = 'active'::public.user_account_status,
        is_verified = true,
        updated_at = now()
    WHERE email = 'admin@sidehustle.lr';
END $$;

-- Also create a helper function to promote any existing user to admin by email
-- Useful for promoting the account you already signed up with
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(target_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE public.user_profiles
  SET role = 'admin'::public.user_role,
      account_status = 'active'::public.user_account_status,
      is_verified = true,
      updated_at = now()
  WHERE email = target_email;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count > 0 THEN
    RETURN 'SUCCESS: User ' || target_email || ' promoted to admin.';
  ELSE
    RETURN 'NOT_FOUND: No user_profiles row found for ' || target_email || '. Make sure the user has signed up first.';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_user_to_admin(TEXT) TO service_role;
