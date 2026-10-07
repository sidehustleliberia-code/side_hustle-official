-- ============================================================
-- CLEANUP: Delete all test business records
-- Preserves: user_profiles, customer_profiles, provider_profiles,
--            service_categories, auth.users
-- Deletes:   jobs and all dependent business data
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE 'Starting Side Hustle test data cleanup...';

  -- 1. dispute_evidence (depends on disputes)
  DELETE FROM public.dispute_evidence;
  RAISE NOTICE 'Cleared dispute_evidence';

  -- 2. disputes (depends on jobs)
  DELETE FROM public.disputes;
  RAISE NOTICE 'Cleared disputes';

  -- 3. reviews (depends on jobs)
  DELETE FROM public.reviews;
  RAISE NOTICE 'Cleared reviews';

  -- 4. proof_of_work (depends on jobs)
  DELETE FROM public.proof_of_work;
  RAISE NOTICE 'Cleared proof_of_work';

  -- 5. notifications (depends on jobs)
  DELETE FROM public.notifications;
  RAISE NOTICE 'Cleared notifications';

  -- 6. job_status_history (depends on jobs)
  DELETE FROM public.job_status_history;
  RAISE NOTICE 'Cleared job_status_history';

  -- 7. job_cancellations (depends on jobs)
  DELETE FROM public.job_cancellations;
  RAISE NOTICE 'Cleared job_cancellations';

  -- 8. provider_earnings (depends on jobs)
  DELETE FROM public.provider_earnings;
  RAISE NOTICE 'Cleared provider_earnings';

  -- 9. provider_disbursements (standalone, linked to provider_profiles)
  DELETE FROM public.provider_disbursements;
  RAISE NOTICE 'Cleared provider_disbursements';

  -- 10. payments (depends on jobs)
  DELETE FROM public.payments;
  RAISE NOTICE 'Cleared payments';

  -- 11. jobs (root business table)
  DELETE FROM public.jobs;
  RAISE NOTICE 'Cleared jobs';

  -- 12. Reset aggregate counters on provider_profiles
  UPDATE public.provider_profiles
  SET
    total_jobs      = 0,
    total_earned    = 0,
    current_balance = 0,
    escrow_balance  = 0,
    rating          = 0;
  RAISE NOTICE 'Reset provider_profiles aggregate counters';

  -- 13. Reset aggregate counters on customer_profiles
  UPDATE public.customer_profiles
  SET
    total_jobs  = 0,
    total_spent = 0;
  RAISE NOTICE 'Reset customer_profiles aggregate counters';

  RAISE NOTICE 'Cleanup complete. Preserved: user_profiles (%), customer_profiles (%), provider_profiles (%), service_categories (%)',
    (SELECT COUNT(*) FROM public.user_profiles),
    (SELECT COUNT(*) FROM public.customer_profiles),
    (SELECT COUNT(*) FROM public.provider_profiles),
    (SELECT COUNT(*) FROM public.service_categories);

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Cleanup failed: %', SQLERRM;
END $$;
