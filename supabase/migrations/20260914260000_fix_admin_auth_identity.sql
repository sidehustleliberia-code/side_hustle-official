-- Migration: Fix admin user auth identity
-- The previous migration inserted into auth.users but missed auth.identities,
-- which is required by Supabase GoTrue for email/password authentication.
-- Without an identities row, login always fails with "Invalid login credentials".

DO $$
DECLARE
  v_admin_id UUID;
  v_identity_exists BOOLEAN;
BEGIN
  -- Get the admin user id
  SELECT id INTO v_admin_id
  FROM auth.users
  WHERE email = 'admin@sidehustle.lr'
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    -- Admin user doesn't exist at all — create from scratch with correct password hash
    v_admin_id := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      is_sso_user, is_anonymous,
      confirmation_token, recovery_token,
      email_change_token_new, email_change,
      email_change_token_current, email_change_confirm_status,
      reauthentication_token,
      phone, phone_change, phone_change_token
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
      '', '',
      '', '',
      '', 0,
      '',
      null, '', ''
    );

    RAISE NOTICE 'Admin auth.users row created with id: %', v_admin_id;
  ELSE
    -- Admin exists — refresh the password hash to ensure it's valid
    UPDATE auth.users
    SET
      encrypted_password = crypt('Admin@SideHustle2026', gen_salt('bf', 10)),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now(),
      raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[])
    WHERE id = v_admin_id;

    RAISE NOTICE 'Admin auth.users password refreshed for id: %', v_admin_id;
  END IF;

  -- Check if identity row exists
  SELECT EXISTS(
    SELECT 1 FROM auth.identities
    WHERE user_id = v_admin_id AND provider = 'email'
  ) INTO v_identity_exists;

  IF NOT v_identity_exists THEN
    -- Insert the identity row — this is what GoTrue needs for email/password login
    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      provider,
      identity_data,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_admin_id,
      v_admin_id::TEXT,
      'email',
      jsonb_build_object(
        'sub', v_admin_id::TEXT,
        'email', 'admin@sidehustle.lr',
        'email_verified', true,
        'provider', 'email'
      ),
      now(),
      now(),
      now()
    )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Admin auth.identities row created for user id: %', v_admin_id;
  ELSE
    RAISE NOTICE 'Admin auth.identities row already exists for user id: %', v_admin_id;
  END IF;

  -- Ensure user_profiles row has admin role
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

  RAISE NOTICE 'Admin user_profiles row ensured for id: %', v_admin_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Admin fix migration error: %', SQLERRM;
END $$;
