-- Migration: Recreate demo accounts for Fatu (customer) and Emmanuel (provider)
-- Fatu credentials:    fatu.kamara@sidehustle.lr    / Customer@2026
-- Emmanuel credentials: emmanuel.dolo@sidehustle.lr / Provider@2026

DO $$
DECLARE
  v_fatu_id    UUID;
  v_emmanuel_id UUID;
  v_existing_id UUID;
BEGIN

  -- ─────────────────────────────────────────────
  -- 1. FATU KAMARA  (customer)
  -- ─────────────────────────────────────────────
  SELECT id INTO v_existing_id
  FROM auth.users
  WHERE email = 'fatu.kamara@sidehustle.lr'
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    v_fatu_id := v_existing_id;
    -- Update password in case it was changed
    UPDATE auth.users
    SET encrypted_password = crypt('Customer@2026', gen_salt('bf', 10)),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now(),
        raw_user_meta_data = jsonb_build_object('full_name', 'Fatu Kamara', 'role', 'customer')
    WHERE id = v_fatu_id;

    RAISE NOTICE 'Fatu auth user already exists (%), password refreshed.', v_fatu_id;
  ELSE
    v_fatu_id := gen_random_uuid();

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
      v_fatu_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'fatu.kamara@sidehustle.lr',
      crypt('Customer@2026', gen_salt('bf', 10)),
      now(), now(), now(),
      jsonb_build_object('full_name', 'Fatu Kamara', 'role', 'customer'),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
      false, false,
      '', null, '', null, '', '', null, '', 0, '', null,
      null, '', '', null
    );

    -- Create identity record for email provider
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      v_fatu_id,
      jsonb_build_object('sub', v_fatu_id::text, 'email', 'fatu.kamara@sidehustle.lr'),
      'email',
      'fatu.kamara@sidehustle.lr',
      now(), now(), now()
    )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Fatu auth user created with id: %', v_fatu_id;
  END IF;

  -- Ensure user_profiles row exists for Fatu
  INSERT INTO public.user_profiles (id, email, full_name, role, account_status, is_verified)
  VALUES (
    v_fatu_id,
    'fatu.kamara@sidehustle.lr',
    'Fatu Kamara',
    'customer'::public.user_role,
    'active'::public.user_account_status,
    true
  )
  ON CONFLICT (id) DO UPDATE
    SET role = 'customer'::public.user_role,
        account_status = 'active'::public.user_account_status,
        is_verified = true,
        full_name = COALESCE(NULLIF(public.user_profiles.full_name, ''), 'Fatu Kamara'),
        updated_at = now();

  INSERT INTO public.user_profiles (id, email, full_name, role, account_status, is_verified)
  VALUES (
    v_fatu_id,
    'fatu.kamara@sidehustle.lr',
    'Fatu Kamara',
    'customer'::public.user_role,
    'active'::public.user_account_status,
    true
  )
  ON CONFLICT (email) DO UPDATE
    SET role = 'customer'::public.user_role,
        account_status = 'active'::public.user_account_status,
        is_verified = true,
        updated_at = now();

  -- Ensure customer_profiles row exists for Fatu
  INSERT INTO public.customer_profiles (user_id)
  VALUES (v_fatu_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- ─────────────────────────────────────────────
  -- 2. EMMANUEL DOLO  (provider)
  -- ─────────────────────────────────────────────
  v_existing_id := NULL;

  SELECT id INTO v_existing_id
  FROM auth.users
  WHERE email = 'emmanuel.dolo@sidehustle.lr'
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    v_emmanuel_id := v_existing_id;
    -- Update password in case it was changed
    UPDATE auth.users
    SET encrypted_password = crypt('Provider@2026', gen_salt('bf', 10)),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now(),
        raw_user_meta_data = jsonb_build_object('full_name', 'Emmanuel Dolo', 'role', 'provider')
    WHERE id = v_emmanuel_id;

    RAISE NOTICE 'Emmanuel auth user already exists (%), password refreshed.', v_emmanuel_id;
  ELSE
    v_emmanuel_id := gen_random_uuid();

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
      v_emmanuel_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'emmanuel.dolo@sidehustle.lr',
      crypt('Provider@2026', gen_salt('bf', 10)),
      now(), now(), now(),
      jsonb_build_object('full_name', 'Emmanuel Dolo', 'role', 'provider'),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
      false, false,
      '', null, '', null, '', '', null, '', 0, '', null,
      null, '', '', null
    );

    -- Create identity record for email provider
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      v_emmanuel_id,
      jsonb_build_object('sub', v_emmanuel_id::text, 'email', 'emmanuel.dolo@sidehustle.lr'),
      'email',
      'emmanuel.dolo@sidehustle.lr',
      now(), now(), now()
    )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Emmanuel auth user created with id: %', v_emmanuel_id;
  END IF;

  -- Ensure user_profiles row exists for Emmanuel
  INSERT INTO public.user_profiles (id, email, full_name, role, account_status, is_verified)
  VALUES (
    v_emmanuel_id,
    'emmanuel.dolo@sidehustle.lr',
    'Emmanuel Dolo',
    'provider'::public.user_role,
    'active'::public.user_account_status,
    true
  )
  ON CONFLICT (id) DO UPDATE
    SET role = 'provider'::public.user_role,
        account_status = 'active'::public.user_account_status,
        is_verified = true,
        full_name = COALESCE(NULLIF(public.user_profiles.full_name, ''), 'Emmanuel Dolo'),
        updated_at = now();

  INSERT INTO public.user_profiles (id, email, full_name, role, account_status, is_verified)
  VALUES (
    v_emmanuel_id,
    'emmanuel.dolo@sidehustle.lr',
    'Emmanuel Dolo',
    'provider'::public.user_role,
    'active'::public.user_account_status,
    true
  )
  ON CONFLICT (email) DO UPDATE
    SET role = 'provider'::public.user_role,
        account_status = 'active'::public.user_account_status,
        is_verified = true,
        updated_at = now();

  -- Ensure provider_profiles row exists for Emmanuel
  INSERT INTO public.provider_profiles (user_id, is_available, provider_status)
  VALUES (
    v_emmanuel_id,
    true,
    'active'::public.provider_status
  )
  ON CONFLICT (user_id) DO UPDATE
    SET provider_status = 'active'::public.provider_status,
        is_available = true,
        updated_at = now();

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Demo account creation encountered an issue: %', SQLERRM;
END $$;
