-- 020_storage_buckets.sql
-- Supabase Storage bucket configuration and RLS policies.
-- ALL evidence buckets are PRIVATE — no public access.
-- Signed URLs must be used to serve files.
--
-- Bucket creation is done via Supabase Dashboard or CLI (not SQL).
-- This migration creates the STORAGE RLS POLICIES only.
--
-- Required buckets (create in Dashboard → Storage):
--   case-evidences         (private, max 10MB)
--   inspection-evidences   (private, max 10MB)
--   asset-photos           (private, max 5MB)
--   avatars                (private, max 2MB)
--
-- Object path conventions:
--   case-evidences/{warehouseId}/{caseId}/{uuid}.jpg
--   inspection-evidences/{warehouseId}/{inspectionId}/{uuid}.jpg
--   asset-photos/{warehouseId}/{assetId}/{uuid}.jpg
--   avatars/{userId}/{uuid}.jpg
--
-- A user must NOT be able to access another warehouse's files by guessing paths.
-- Path-based warehouse isolation is enforced in RLS.

-- ── Helper: extract segment N from a storage object name ─────────────────
-- storage.foldername returns ARRAY of path segments
-- segment 1 = warehouseId, segment 2 = recordId

-- ── case-evidences bucket policies ───────────────────────────────────────
-- Path: {warehouseId}/{caseId}/{filename}
-- Access: user must have warehouse access + case visibility

CREATE POLICY "case-evidences: upload by case participants"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'case-evidences'
  -- Segment 1 (index 0) = warehouseId
  AND (storage.foldername(name))[1] = ANY(public.get_user_warehouse_ids()::text[])
  AND public.has_capability(
    (storage.foldername(name))[1]::uuid,
    'evidence.upload'
  )
  AND (
    -- Must be case participant or have view_all
    public.has_capability((storage.foldername(name))[1]::uuid, 'case.view_all')
    OR public.is_case_participant((storage.foldername(name))[2]::uuid)
  )
);

CREATE POLICY "case-evidences: read by case participants"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'case-evidences'
  AND (storage.foldername(name))[1] = ANY(public.get_user_warehouse_ids()::text[])
  AND (
    public.has_capability((storage.foldername(name))[1]::uuid, 'case.view_all')
    OR public.is_case_participant((storage.foldername(name))[2]::uuid)
  )
);

CREATE POLICY "case-evidences: delete by coordinator+"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'case-evidences'
  AND (storage.foldername(name))[1] = ANY(public.get_user_warehouse_ids()::text[])
  AND public.has_capability(
    (storage.foldername(name))[1]::uuid,
    'case.view_all'  -- coordinators and above
  )
);

-- ── inspection-evidences bucket policies ──────────────────────────────────
-- Path: {warehouseId}/{inspectionId}/{filename}

CREATE POLICY "inspection-evidences: upload by inspectors"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'inspection-evidences'
  AND (storage.foldername(name))[1] = ANY(public.get_user_warehouse_ids()::text[])
  AND public.has_capability(
    (storage.foldername(name))[1]::uuid,
    'evidence.upload'
  )
  AND (
    public.has_capability((storage.foldername(name))[1]::uuid, 'inspection.view')
  )
);

CREATE POLICY "inspection-evidences: read by warehouse members with inspection.view"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'inspection-evidences'
  AND (storage.foldername(name))[1] = ANY(public.get_user_warehouse_ids()::text[])
  AND public.has_capability(
    (storage.foldername(name))[1]::uuid,
    'inspection.view'
  )
);

CREATE POLICY "inspection-evidences: delete by coordinator+"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'inspection-evidences'
  AND (storage.foldername(name))[1] = ANY(public.get_user_warehouse_ids()::text[])
  AND public.has_capability(
    (storage.foldername(name))[1]::uuid,
    'inspection.manage_template'
  )
);

-- ── asset-photos bucket policies ──────────────────────────────────────────
-- Path: {warehouseId}/{assetId}/{filename}

CREATE POLICY "asset-photos: upload by asset.manage"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'asset-photos'
  AND (storage.foldername(name))[1] = ANY(public.get_user_warehouse_ids()::text[])
  AND public.has_capability(
    (storage.foldername(name))[1]::uuid,
    'asset.manage'
  )
);

CREATE POLICY "asset-photos: read by asset.view"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'asset-photos'
  AND (storage.foldername(name))[1] = ANY(public.get_user_warehouse_ids()::text[])
  AND public.has_capability(
    (storage.foldername(name))[1]::uuid,
    'asset.view'
  )
);

CREATE POLICY "asset-photos: delete by asset.manage"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'asset-photos'
  AND (storage.foldername(name))[1] = ANY(public.get_user_warehouse_ids()::text[])
  AND public.has_capability(
    (storage.foldername(name))[1]::uuid,
    'asset.manage'
  )
);

-- ── avatars bucket policies ───────────────────────────────────────────────
-- Path: {userId}/{filename}
-- Users can manage only their own avatar.

CREATE POLICY "avatars: upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "avatars: read any avatar (profile display)"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "avatars: delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
