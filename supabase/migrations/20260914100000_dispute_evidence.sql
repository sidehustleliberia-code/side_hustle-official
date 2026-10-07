-- ============================================================
-- SideHustle: Dispute Evidence (Photo Upload Support)
-- ============================================================

-- Create dispute-evidence storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dispute-evidence',
  'dispute-evidence',
  true,
  10485760, -- 10 MB per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can upload to their own folder
DROP POLICY IF EXISTS "users_upload_dispute_evidence" ON storage.objects;
CREATE POLICY "users_upload_dispute_evidence"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'dispute-evidence'
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

DROP POLICY IF EXISTS "users_delete_own_dispute_evidence" ON storage.objects;
CREATE POLICY "users_delete_own_dispute_evidence"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'dispute-evidence'
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

DROP POLICY IF EXISTS "public_read_dispute_evidence" ON storage.objects;
CREATE POLICY "public_read_dispute_evidence"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'dispute-evidence');

-- Dispute evidence table: links uploaded photos to a dispute
CREATE TABLE IF NOT EXISTS public.dispute_evidence (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id  uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES public.user_profiles(id),
  public_url  text NOT NULL,
  file_name   text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dispute_evidence ENABLE ROW LEVEL SECURITY;

-- Parties to the dispute and admins can view evidence
DROP POLICY IF EXISTS "dispute_evidence_select" ON public.dispute_evidence;
CREATE POLICY "dispute_evidence_select" ON public.dispute_evidence
  FOR SELECT USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.disputes d
      JOIN public.jobs j ON j.id = d.job_id
      WHERE d.id = dispute_id
        AND (j.customer_id = auth.uid() OR j.provider_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- Only the uploader can insert evidence
DROP POLICY IF EXISTS "dispute_evidence_insert" ON public.dispute_evidence;
CREATE POLICY "dispute_evidence_insert" ON public.dispute_evidence
  FOR INSERT WITH CHECK (uploaded_by = auth.uid());

-- Enable Realtime on dispute_evidence
ALTER PUBLICATION supabase_realtime ADD TABLE public.dispute_evidence;
