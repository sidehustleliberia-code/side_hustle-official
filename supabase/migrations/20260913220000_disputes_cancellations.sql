-- ============================================================
-- SideHustle: Disputes & Cancellations/Declines Migration
-- ============================================================

-- Ensure disputes table exists with all required columns
CREATE TABLE IF NOT EXISTS public.disputes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  raised_by     uuid NOT NULL REFERENCES public.user_profiles(id),
  raised_by_role text NOT NULL CHECK (raised_by_role IN ('customer', 'provider')),
  reason        text NOT NULL,
  description   text,
  dispute_status text NOT NULL DEFAULT 'open' CHECK (dispute_status IN ('open', 'under_review', 'resolved', 'closed')),
  resolved_by   uuid REFERENCES public.user_profiles(id),
  resolution_note text,
  resolved_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Job cancellations log
CREATE TABLE IF NOT EXISTS public.job_cancellations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  cancelled_by    uuid NOT NULL REFERENCES public.user_profiles(id),
  cancelled_by_role text NOT NULL CHECK (cancelled_by_role IN ('customer', 'provider')),
  reason          text NOT NULL,
  refund_issued   boolean NOT NULL DEFAULT false,
  refund_amount   numeric(12,2),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Add cancelled_by_role to jobs if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'cancelled_by'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN cancelled_by uuid REFERENCES public.user_profiles(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'cancellation_reason'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN cancellation_reason text;
  END IF;
END $$;

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_cancellations ENABLE ROW LEVEL SECURITY;

-- Disputes: users can read disputes they are party to; admins can read all
DROP POLICY IF EXISTS "disputes_select" ON public.disputes;
CREATE POLICY "disputes_select" ON public.disputes
  FOR SELECT USING (
    raised_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND (j.customer_id = auth.uid() OR j.provider_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

DROP POLICY IF EXISTS "disputes_insert" ON public.disputes;
CREATE POLICY "disputes_insert" ON public.disputes
  FOR INSERT WITH CHECK (raised_by = auth.uid());

DROP POLICY IF EXISTS "disputes_update_admin" ON public.disputes;
CREATE POLICY "disputes_update_admin" ON public.disputes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- Cancellations: parties can read their own; admins can read all
DROP POLICY IF EXISTS "cancellations_select" ON public.job_cancellations;
CREATE POLICY "cancellations_select" ON public.job_cancellations
  FOR SELECT USING (
    cancelled_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND (j.customer_id = auth.uid() OR j.provider_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

DROP POLICY IF EXISTS "cancellations_insert" ON public.job_cancellations;
CREATE POLICY "cancellations_insert" ON public.job_cancellations
  FOR INSERT WITH CHECK (cancelled_by = auth.uid());

-- ============================================================
-- Trigger: auto-update disputes.updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_disputes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_disputes_updated_at ON public.disputes;
CREATE TRIGGER trg_disputes_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.set_disputes_updated_at();

-- ============================================================
-- Trigger: notify admin when a dispute is raised
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_admin_on_dispute()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_job_ref text;
  v_admin_id uuid;
BEGIN
  SELECT ref INTO v_job_ref FROM public.jobs WHERE id = NEW.job_id;

  -- Notify all admins
  FOR v_admin_id IN
    SELECT id FROM public.user_profiles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, notification_type, title, body, job_id)
    VALUES (
      v_admin_id,
      'dispute_raised',
      'New Dispute Filed',
      'A dispute has been raised for job ' || COALESCE(v_job_ref, NEW.job_id::text) || ': ' || NEW.reason,
      NEW.job_id
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_dispute ON public.disputes;
CREATE TRIGGER trg_notify_admin_dispute
  AFTER INSERT ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_dispute();

-- ============================================================
-- Trigger: notify customer when provider declines / cancels
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_on_job_cancellation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_job_ref text;
  v_notify_user uuid;
  v_title text;
  v_body text;
BEGIN
  SELECT ref INTO v_job_ref FROM public.jobs WHERE id = NEW.job_id;

  IF NEW.cancelled_by_role = 'provider' THEN
    -- Notify customer that provider declined
    SELECT customer_id INTO v_notify_user FROM public.jobs WHERE id = NEW.job_id;
    v_title := 'Provider Declined Your Job';
    v_body := 'Your provider has declined job ' || COALESCE(v_job_ref, '') || '. The job has been returned to the queue.';
  ELSE
    -- Notify provider (if assigned) that customer cancelled
    SELECT provider_id INTO v_notify_user FROM public.jobs WHERE id = NEW.job_id;
    v_title := 'Customer Cancelled Order';
    v_body := 'The customer has cancelled job ' || COALESCE(v_job_ref, '') || '.';
  END IF;

  IF v_notify_user IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, notification_type, title, body, job_id)
    VALUES (v_notify_user, 'system', v_title, v_body, NEW.job_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_cancellation ON public.job_cancellations;
CREATE TRIGGER trg_notify_cancellation
  AFTER INSERT ON public.job_cancellations
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_job_cancellation();
