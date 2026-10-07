-- Extend the provider withdrawal state machine to match the marketplace cash flow requirements.
-- This keeps the app architecture aligned with pending → under_review → approved → processing → completed,
-- while also supporting rejection/failure paths without arbitrary status drift.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'disbursement_status'
      AND e.enumlabel = 'under_review'
  ) THEN
    ALTER TYPE public.disbursement_status ADD VALUE 'under_review';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'disbursement_status'
      AND e.enumlabel = 'approved'
  ) THEN
    ALTER TYPE public.disbursement_status ADD VALUE 'approved';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'disbursement_status'
      AND e.enumlabel = 'rejected'
  ) THEN
    ALTER TYPE public.disbursement_status ADD VALUE 'rejected';
  END IF;
END $$;

ALTER TABLE public.provider_disbursements
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_provider_disbursements_status
  ON public.provider_disbursements (disbursement_status);

CREATE INDEX IF NOT EXISTS idx_provider_disbursements_provider_id
  ON public.provider_disbursements (provider_id, disbursement_status);
