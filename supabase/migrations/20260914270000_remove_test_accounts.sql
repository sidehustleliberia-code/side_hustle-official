-- ============================================================
-- CLEANUP: Remove seeded test customer and provider accounts
-- Deletes: fatu.kamara@sidehustle.lr, abigail.konneh@sidehustle.lr,
--          emmanuel.dolo@sidehustle.lr, grace.toe@sidehustle.lr
-- Preserves: admin account and all real user-registered accounts
-- ============================================================

DO $$
DECLARE
  v_test_emails TEXT[] := ARRAY[
    'fatu.kamara@sidehustle.lr',
    'abigail.konneh@sidehustle.lr',
    'emmanuel.dolo@sidehustle.lr',
    'grace.toe@sidehustle.lr'
  ];
  v_test_user_ids UUID[];
  v_test_job_ids UUID[];
BEGIN
  -- Collect the auth user IDs for the test accounts
  SELECT ARRAY_AGG(id) INTO v_test_user_ids
  FROM auth.users
  WHERE email = ANY(v_test_emails);

  IF v_test_user_ids IS NULL OR array_length(v_test_user_ids, 1) = 0 THEN
    RAISE NOTICE 'No test accounts found. Nothing to delete.';
    RETURN;
  END IF;

  RAISE NOTICE 'Found % test account(s) to remove.', array_length(v_test_user_ids, 1);

  -- Collect job IDs linked to these test users (as customer or provider)
  SELECT ARRAY_AGG(id) INTO v_test_job_ids
  FROM public.jobs
  WHERE customer_id = ANY(v_test_user_ids)
     OR provider_id = ANY(v_test_user_ids);

  -- 1. dispute_evidence (depends on disputes)
  IF v_test_job_ids IS NOT NULL THEN
    DELETE FROM public.dispute_evidence
    WHERE dispute_id IN (
      SELECT id FROM public.disputes WHERE job_id = ANY(v_test_job_ids)
    );
    RAISE NOTICE 'Cleared dispute_evidence for test jobs';

    -- 2. disputes
    DELETE FROM public.disputes WHERE job_id = ANY(v_test_job_ids);
    RAISE NOTICE 'Cleared disputes for test jobs';

    -- 3. reviews
    DELETE FROM public.reviews WHERE job_id = ANY(v_test_job_ids);
    RAISE NOTICE 'Cleared reviews for test jobs';

    -- 4. proof_of_work
    DELETE FROM public.proof_of_work WHERE job_id = ANY(v_test_job_ids);
    RAISE NOTICE 'Cleared proof_of_work for test jobs';

    -- 5. job_status_history
    DELETE FROM public.job_status_history WHERE job_id = ANY(v_test_job_ids);
    RAISE NOTICE 'Cleared job_status_history for test jobs';

    -- 6. job_cancellations
    DELETE FROM public.job_cancellations WHERE job_id = ANY(v_test_job_ids);
    RAISE NOTICE 'Cleared job_cancellations for test jobs';

    -- 7. provider_earnings linked to test jobs
    DELETE FROM public.provider_earnings WHERE job_id = ANY(v_test_job_ids);
    RAISE NOTICE 'Cleared provider_earnings for test jobs';

    -- 8. payments linked to test jobs
    DELETE FROM public.payments WHERE job_id = ANY(v_test_job_ids);
    RAISE NOTICE 'Cleared payments for test jobs';

    -- 9. jobs
    DELETE FROM public.jobs WHERE id = ANY(v_test_job_ids);
    RAISE NOTICE 'Cleared jobs for test accounts';
  END IF;

  -- 10. provider_disbursements linked to test users
  DELETE FROM public.provider_disbursements WHERE provider_id = ANY(v_test_user_ids);
  RAISE NOTICE 'Cleared provider_disbursements for test accounts';

  -- 11. provider_earnings linked to test users (any remaining)
  DELETE FROM public.provider_earnings WHERE provider_id = ANY(v_test_user_ids);
  RAISE NOTICE 'Cleared remaining provider_earnings for test accounts';

  -- 12. notifications linked to test users
  DELETE FROM public.notifications WHERE user_id = ANY(v_test_user_ids);
  RAISE NOTICE 'Cleared notifications for test accounts';

  -- 13. provider_profiles
  DELETE FROM public.provider_profiles WHERE user_id = ANY(v_test_user_ids);
  RAISE NOTICE 'Cleared provider_profiles for test accounts';

  -- 14. customer_profiles
  DELETE FROM public.customer_profiles WHERE user_id = ANY(v_test_user_ids);
  RAISE NOTICE 'Cleared customer_profiles for test accounts';

  -- 15. user_profiles
  DELETE FROM public.user_profiles WHERE id = ANY(v_test_user_ids);
  RAISE NOTICE 'Cleared user_profiles for test accounts';

  -- 16. auth.identities (required before deleting auth.users)
  DELETE FROM auth.identities WHERE user_id = ANY(v_test_user_ids);
  RAISE NOTICE 'Cleared auth.identities for test accounts';

  -- 17. auth.mfa_amr_claims (must be deleted BEFORE sessions)
  DELETE FROM auth.mfa_amr_claims
  WHERE session_id IN (
    SELECT id FROM auth.sessions WHERE user_id = ANY(v_test_user_ids)
  );
  RAISE NOTICE 'Cleared auth.mfa_amr_claims for test accounts';

  -- 18. auth.sessions
  DELETE FROM auth.sessions WHERE user_id = ANY(v_test_user_ids);
  RAISE NOTICE 'Cleared auth.sessions for test accounts';

  -- 19. auth.refresh_tokens (user_id column is character varying, cast UUID array to text[])
  DELETE FROM auth.refresh_tokens
  WHERE user_id = ANY(
    SELECT id::text FROM auth.users WHERE id = ANY(v_test_user_ids)
  );
  RAISE NOTICE 'Cleared auth.refresh_tokens for test accounts';

  -- 20. Finally delete from auth.users
  DELETE FROM auth.users WHERE id = ANY(v_test_user_ids);
  RAISE NOTICE 'Deleted % test auth.users account(s)', array_length(v_test_user_ids, 1);

  RAISE NOTICE 'Test account cleanup complete. Remaining user_profiles: %',
    (SELECT COUNT(*) FROM public.user_profiles);

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Test account cleanup failed: %', SQLERRM;
END $$;
