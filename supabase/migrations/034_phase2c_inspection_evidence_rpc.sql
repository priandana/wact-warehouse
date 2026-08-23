-- 034_phase2c_inspection_evidence_rpc.sql
-- Phase 2C: Inspection Evidence Hardened Storage Policies & Authoritative Persistence RPC
--
-- 1. Adds UNIQUE constraint on public.inspection_evidences(file_url) for deterministic storage binding
-- 2. Hardens storage.objects INSERT policy for bucket 'inspection-evidences' (scoped to active draft assigned inspector)
-- 3. Hardens storage.objects DELETE policy for bucket 'inspection-evidences' (orphan cleanup only: forbids deleting persisted evidence)
-- 4. Creates authoritative SECURITY DEFINER RPC add_inspection_evidence() with:
--    - Row locking (FOR UPDATE) on public.inspections to serialize Evidence vs Complete
--    - Mandatory inspection_result_id
--    - Canonical size/MIME derivation from storage.objects
--    - Fail-fast 3-segment path validation {warehouseId}/{inspectionId}/{fileName}
--    - Strict IS DISTINCT FROM comparisons
--    - Atomic INSERT ... ON CONFLICT (file_url) DO NOTHING with idempotent retry safety

BEGIN;

-- ── 1. Unique constraint for deterministic file_url uniqueness ───────────────
CREATE UNIQUE INDEX IF NOT EXISTS uq_inspection_evidences_file_url
  ON public.inspection_evidences (file_url);

-- ── 2. Hardened Storage Policies for 'inspection-evidences' ──────────────────

-- 2.1 Upload: Drop old permissive upload policy and replace with scoped draft inspector policy
DROP POLICY IF EXISTS "inspection-evidences: upload by inspectors" ON storage.objects;
DROP POLICY IF EXISTS "inspection-evidences: upload by assigned inspector draft" ON storage.objects;

CREATE POLICY "inspection-evidences: upload by assigned inspector draft"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'inspection-evidences'
  AND (storage.foldername(name))[1] = ANY(public.get_user_warehouse_ids()::text[])
  AND public.has_capability((storage.foldername(name))[1]::uuid, 'evidence.upload')
  AND public.has_capability((storage.foldername(name))[1]::uuid, 'inspection.start')
  AND EXISTS (
    SELECT 1 FROM public.inspections
     WHERE id = (storage.foldername(name))[2]::uuid
       AND warehouse_id = (storage.foldername(name))[1]::uuid
       AND status = 'draft'
       AND inspector_id = auth.uid()
  )
);

-- 2.2 Delete: Drop coordinator-only policy and replace with orphan-only cleanup policy
DROP POLICY IF EXISTS "inspection-evidences: delete by coordinator+" ON storage.objects;
DROP POLICY IF EXISTS "inspection-evidences: delete by coordinator or inspector draft" ON storage.objects;
DROP POLICY IF EXISTS "inspection-evidences: orphan cleanup by assigned inspector" ON storage.objects;

CREATE POLICY "inspection-evidences: orphan cleanup by assigned inspector"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'inspection-evidences'
  AND (storage.foldername(name))[1] = ANY(public.get_user_warehouse_ids()::text[])
  AND EXISTS (
    SELECT 1 FROM public.inspections
     WHERE id = (storage.foldername(name))[2]::uuid
       AND warehouse_id = (storage.foldername(name))[1]::uuid
       AND inspector_id = auth.uid()
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.inspection_evidences
     WHERE file_url = storage.objects.name
  )
);

-- ── 3. Authoritative RPC: add_inspection_evidence ───────────────────────────

CREATE OR REPLACE FUNCTION public.add_inspection_evidence(
  p_inspection_id        uuid,
  p_inspection_result_id uuid,
  p_file_url             text,
  p_file_name            text DEFAULT NULL,
  p_file_size            integer DEFAULT NULL,
  p_mime_type            text DEFAULT NULL,
  p_caption              text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_actor_id            uuid := auth.uid();
  v_insp_inspector_id   uuid;
  v_insp_warehouse_id   uuid;
  v_insp_status         text;
  v_res_insp_id         uuid;
  v_path_parts          text[];
  v_storage_size        integer;
  v_storage_mime        text;
  v_final_size          integer;
  v_final_mime          text;
  v_existing_id         uuid;
  v_existing_insp_id    uuid;
  v_existing_result_id  uuid;
  v_evidence_id         uuid;
BEGIN
  -- 1. Validate caller authentication
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Validate mandatory parameters
  IF p_inspection_id IS NULL THEN
    RAISE EXCEPTION 'inspection_id is required';
  END IF;

  IF p_inspection_result_id IS NULL THEN
    RAISE EXCEPTION 'inspection_result_id is mandatory for item checklist evidence';
  END IF;

  IF p_file_url IS NULL OR trim(p_file_url) = '' THEN
    RAISE EXCEPTION 'file_url is required';
  END IF;

  -- 3. Lock inspection row to serialize Evidence vs Complete inspection
  SELECT inspector_id, warehouse_id, status
    INTO v_insp_inspector_id, v_insp_warehouse_id, v_insp_status
    FROM public.inspections
   WHERE id = p_inspection_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inspection % not found', p_inspection_id;
  END IF;

  IF v_insp_status != 'draft' THEN
    RAISE EXCEPTION 'Cannot add evidence to inspection in % status (must be draft)', v_insp_status;
  END IF;

  IF v_insp_inspector_id IS DISTINCT FROM v_actor_id THEN
    RAISE EXCEPTION 'Permission denied: only the assigned inspector can attach evidence to this inspection';
  END IF;

  -- 4. Validate actor warehouse scope & capabilities (evidence.upload and inspection.start)
  IF NOT (v_insp_warehouse_id = ANY(public.get_user_warehouse_ids())) THEN
    RAISE EXCEPTION 'Permission denied: inspection warehouse is no longer in your active scope';
  END IF;

  IF NOT public.has_capability(v_insp_warehouse_id, 'evidence.upload') THEN
    RAISE EXCEPTION 'Permission denied: missing evidence.upload capability in warehouse %', v_insp_warehouse_id;
  END IF;

  IF NOT public.has_capability(v_insp_warehouse_id, 'inspection.start') THEN
    RAISE EXCEPTION 'Permission denied: missing inspection.start capability in warehouse %', v_insp_warehouse_id;
  END IF;

  -- 5. Cross-inspection/cross-result injection prevention:
  -- Verify inspection_result_id exists and belongs strictly to p_inspection_id
  SELECT inspection_id INTO v_res_insp_id
    FROM public.inspection_results
   WHERE id = p_inspection_result_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inspection result % not found', p_inspection_result_id;
  END IF;
  IF v_res_insp_id IS DISTINCT FROM p_inspection_id THEN
    RAISE EXCEPTION 'Cross-inspection evidence injection rejected: result % does not belong to inspection %', p_inspection_result_id, p_inspection_id;
  END IF;

  -- 6. Validate Storage path convention: {warehouseId}/{inspectionId}/{fileName}
  v_path_parts := string_to_array(trim(p_file_url), '/');
  IF array_length(v_path_parts, 1) != 3 THEN
    RAISE EXCEPTION 'Invalid evidence file path format: %. Expected {warehouseId}/{inspectionId}/{fileName}', p_file_url;
  END IF;

  IF v_path_parts[1] IS DISTINCT FROM v_insp_warehouse_id::text THEN
    RAISE EXCEPTION 'Path warehouse % does not match inspection warehouse %', v_path_parts[1], v_insp_warehouse_id;
  END IF;

  IF v_path_parts[2] IS DISTINCT FROM p_inspection_id::text THEN
    RAISE EXCEPTION 'Path inspection ID % does not match inspection %', v_path_parts[2], p_inspection_id;
  END IF;

  IF v_path_parts[3] IS NULL OR trim(v_path_parts[3]) = '' THEN
    RAISE EXCEPTION 'Filename segment in path cannot be empty';
  END IF;

  -- 7. Verify object existence in storage.objects and derive canonical metadata
  SELECT (metadata->>'size')::int, metadata->>'mimetype'
    INTO v_storage_size, v_storage_mime
    FROM storage.objects
   WHERE bucket_id = 'inspection-evidences'
     AND name = trim(p_file_url);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Storage object % does not exist in bucket inspection-evidences', p_file_url;
  END IF;

  v_final_size := COALESCE(v_storage_size, p_file_size);
  v_final_mime := COALESCE(v_storage_mime, p_mime_type, 'image/jpeg');

  -- 8. Validate size constraints (1 byte to 10MB)
  IF v_final_size IS NULL OR v_final_size <= 0 OR v_final_size > 10485760 THEN
    RAISE EXCEPTION 'Invalid file size: % bytes (must be between 1 byte and 10MB)', v_final_size;
  END IF;

  -- 9. Validate MIME type
  IF v_final_mime NOT IN ('image/jpeg', 'image/png', 'image/webp') THEN
    RAISE EXCEPTION 'Invalid mime_type: %. Must be image/jpeg, image/png, or image/webp', v_final_mime;
  END IF;

  -- 10. Validate text lengths
  IF p_file_name IS NOT NULL AND length(trim(p_file_name)) > 255 THEN
    RAISE EXCEPTION 'file_name exceeds 255 characters';
  END IF;

  IF p_caption IS NOT NULL AND length(trim(p_caption)) > 500 THEN
    RAISE EXCEPTION 'caption exceeds 500 characters';
  END IF;

  -- 11. Atomic Insert with ON CONFLICT (file_url) for race-free idempotency
  INSERT INTO public.inspection_evidences (
    inspection_id,
    inspection_result_id,
    uploader_id,
    file_url,
    file_name,
    file_size,
    mime_type,
    caption,
    uploaded_at
  ) VALUES (
    p_inspection_id,
    p_inspection_result_id,
    v_actor_id,
    trim(p_file_url),
    trim(p_file_name),
    v_final_size,
    v_final_mime,
    trim(p_caption),
    now()
  )
  ON CONFLICT (file_url) DO NOTHING
  RETURNING id INTO v_evidence_id;

  -- If inserted successfully on first attempt, return generated ID
  IF v_evidence_id IS NOT NULL THEN
    RETURN v_evidence_id;
  END IF;

  -- Conflict detected: evaluate existing row atomically
  SELECT id, inspection_id, inspection_result_id
    INTO v_existing_id, v_existing_insp_id, v_existing_result_id
    FROM public.inspection_evidences
   WHERE file_url = trim(p_file_url);

  IF v_existing_insp_id = p_inspection_id AND v_existing_result_id = p_inspection_result_id THEN
    RETURN v_existing_id;
  ELSE
    RAISE EXCEPTION 'file_url % is already associated with a different inspection or result (% / %)',
      p_file_url, v_existing_insp_id, v_existing_result_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.add_inspection_evidence(uuid, uuid, text, text, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_inspection_evidence(uuid, uuid, text, text, integer, text, text) TO authenticated;

COMMIT;
