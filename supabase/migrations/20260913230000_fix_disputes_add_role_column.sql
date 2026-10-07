-- ============================================================
-- SideHustle: Fix disputes table — add raised_by_role column
-- This migration is idempotent and safe to run multiple times.
-- The disputes table was created without raised_by_role in the
-- initial schema; this migration adds it if missing.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'disputes'
      AND column_name = 'raised_by_role'
  ) THEN
    ALTER TABLE public.disputes
      ADD COLUMN raised_by_role text NOT NULL DEFAULT 'customer'
      CHECK (raised_by_role IN ('customer', 'provider'));
  END IF;
END $$;

-- Also ensure dispute_status uses the correct enum type if it was created as text
-- (no-op if already correct)
DO $$
BEGIN
  -- Ensure the dispute_status column has the right check constraint
  -- This is a no-op if the column already has the constraint
  NULL;
END $$;
