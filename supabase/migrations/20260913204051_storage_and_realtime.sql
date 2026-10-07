-- ============================================================
-- SideHustle — Storage Bucket + Realtime Publication
-- ============================================================

-- Create proof-of-work storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'proof-of-work',
  'proof-of-work',
  true,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: providers can upload to their own folder
DROP POLICY IF EXISTS "providers_upload_proof" ON storage.objects;
CREATE POLICY "providers_upload_proof"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'proof-of-work'
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

DROP POLICY IF EXISTS "providers_delete_own_proof" ON storage.objects;
CREATE POLICY "providers_delete_own_proof"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'proof-of-work'
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

DROP POLICY IF EXISTS "public_read_proof" ON storage.objects;
CREATE POLICY "public_read_proof"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'proof-of-work');

-- Enable Realtime on jobs table (for live status updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;

-- Enable Realtime on proof_of_work table (for live photo updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.proof_of_work;
