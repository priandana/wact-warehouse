-- 025_security_hardening.sql
-- Security Hardening Patch:
-- 1. Restrict internal helper EXECUTE privileges (next_case_sequence, log_case_activity, send_notification).
-- 2. Make client_request_id mandatory in create_case().
-- 3. Calculate SLA due_date internally inside create_case() (remove caller p_due_date parameter).
-- 4. Remove case.view_all as mutation bypass in update_case_progress, request_case_verification, add_case_comment, add_case_evidence.
-- 5. Clean up old create_case function overloads.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. RESTRICT INTERNAL HELPERS (REVOKE from PUBLIC and authenticated)
-- ═══════════════════════════════════════════════════════════════════════════

-- log_case_activity is an internal helper called only by mutation RPCs
REVOKE ALL ON FUNCTION public.log_case_activity(uuid, text, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_case_activity(uuid, text, text, text, jsonb) FROM authenticated;

-- send_notification is an internal helper called only by mutation RPCs
REVOKE ALL ON FUNCTION public.send_notification(uuid, text, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.send_notification(uuid, text, text, text, jsonb) FROM authenticated;

-- next_case_sequence is an internal sequence generator called only by create_case()
REVOKE ALL ON FUNCTION public.next_case_sequence(uuid, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.next_case_sequence(uuid, date) FROM authenticated;

-- Ensure RLS helpers remain executable by authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_warehouse_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_capability(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_case_participant(uuid) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2 & 3. UPDATE create_case():
--    - Mandatory p_client_request_id (no DEFAULT NULL)
--    - Internal SLA calculation (remove p_due_date parameter)
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop previous function signatures to avoid ambiguous overloads
DROP FUNCTION IF EXISTS public.create_case(uuid, text, text, uuid, uuid, uuid, uuid, uuid, uuid, text, boolean, boolean, text, timestamptz);
DROP FUNCTION IF EXISTS public.create_case(uuid, text, text, uuid, uuid, uuid, uuid, uuid, uuid, text, boolean, boolean, text, timestamptz, uuid);
DROP FUNCTION IF EXISTS public.create_case(uuid, text, text, uuid, uuid, uuid, uuid, uuid, uuid, text, boolean, boolean, text, uuid);

CREATE OR REPLACE FUNCTION public.create_case(
  p_warehouse_id           uuid,
  p_title                  text,
  p_client_request_id      uuid,   -- MANDATORY idempotency identifier (no DEFAULT NULL)
  p_description            text     DEFAULT NULL,
  p_category_id            uuid     DEFAULT NULL,
  p_subcategory_id         uuid     DEFAULT NULL,
  p_area_id                uuid     DEFAULT NULL,
  p_location_id            uuid     DEFAULT NULL,
  p_asset_id               uuid     DEFAULT NULL,
  p_inspection_id          uuid     DEFAULT NULL,
  p_priority               text     DEFAULT 'medium',
  p_has_operational_impact boolean  DEFAULT false,
  p_requires_maintenance   boolean  DEFAULT false,
  p_source                 text     DEFAULT 'direct'
)
RETURNS uuid   -- returns case id (new or existing)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id        uuid := auth.uid();
  v_case_id         uuid;
  v_case_number     text;
  v_wh_code         text;
  v_wh_tz           text;
  v_seq             int;
  v_display_date    text;
  v_local_date      date;
  v_duration_hours  numeric;
  v_due_date        timestamptz;
BEGIN
  -- 1. Validate actor is authenticated
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Validate client_request_id is provided
  IF p_client_request_id IS NULL THEN
    RAISE EXCEPTION 'client_request_id is required for idempotent case creation';
  END IF;

  -- 3. IDEMPOTENCY CHECK — if client_request_id already used by this reporter,
  --    return existing case_id without consuming sequences, logging duplicate activity, or sending duplicate notifications.
  SELECT id INTO v_case_id
    FROM public.cases
   WHERE reporter_id = v_actor_id
     AND client_request_id = p_client_request_id;

  IF FOUND THEN
    RETURN v_case_id;
  END IF;

  -- 4. Validate capability
  IF NOT public.has_capability(p_warehouse_id, 'case.create') THEN
    RAISE EXCEPTION 'Permission denied: missing case.create capability in warehouse %', p_warehouse_id;
  END IF;

  -- 5. Validate warehouse is active
  SELECT code, timezone INTO v_wh_code, v_wh_tz
    FROM public.warehouses
   WHERE id = p_warehouse_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Warehouse % not found or inactive', p_warehouse_id;
  END IF;

  -- 6. Validate priority
  IF p_priority NOT IN ('low', 'medium', 'high', 'critical') THEN
    RAISE EXCEPTION 'Invalid priority: %', p_priority;
  END IF;

  -- 7. Validate source
  IF p_source NOT IN ('direct', 'inspection') THEN
    RAISE EXCEPTION 'Invalid source: %', p_source;
  END IF;

  -- 8. Validate subcategory -> category relationship
  IF p_subcategory_id IS NOT NULL AND p_category_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.case_subcategories
       WHERE id = p_subcategory_id AND category_id = p_category_id
    ) THEN
      RAISE EXCEPTION 'Subcategory % does not belong to category %', p_subcategory_id, p_category_id;
    END IF;
  END IF;

  -- 9. Validate area / location / asset / inspection belong to same warehouse
  IF p_area_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.areas WHERE id = p_area_id AND warehouse_id = p_warehouse_id) THEN
      RAISE EXCEPTION 'Area % does not belong to warehouse %', p_area_id, p_warehouse_id;
    END IF;
  END IF;
  IF p_location_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.locations WHERE id = p_location_id AND warehouse_id = p_warehouse_id) THEN
      RAISE EXCEPTION 'Location % does not belong to warehouse %', p_location_id, p_warehouse_id;
    END IF;
  END IF;
  IF p_asset_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.assets WHERE id = p_asset_id AND warehouse_id = p_warehouse_id) THEN
      RAISE EXCEPTION 'Asset % does not belong to warehouse %', p_asset_id, p_warehouse_id;
    END IF;
  END IF;
  IF p_inspection_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.inspections WHERE id = p_inspection_id AND warehouse_id = p_warehouse_id) THEN
      RAISE EXCEPTION 'Inspection % does not belong to warehouse %', p_inspection_id, p_warehouse_id;
    END IF;
  END IF;

  -- 10. Calculate SLA due date internally
  -- First: look for active warehouse-specific SLA
  SELECT duration_hours INTO v_duration_hours
    FROM public.sla_configurations
   WHERE warehouse_id = p_warehouse_id
     AND priority = p_priority
     AND is_active = true
   LIMIT 1;

  -- Second: fallback to active global SLA
  IF v_duration_hours IS NULL THEN
    SELECT duration_hours INTO v_duration_hours
      FROM public.sla_configurations
     WHERE warehouse_id IS NULL
       AND priority = p_priority
       AND is_active = true
     LIMIT 1;
  END IF;

  -- If no SLA configured: raise clear exception
  IF v_duration_hours IS NULL THEN
    RAISE EXCEPTION 'No active SLA configuration found for priority "%" in warehouse % (or global fallback)', p_priority, p_warehouse_id;
  END IF;

  v_due_date := now() + (v_duration_hours || ' hours')::interval;

  -- 11. Generate case number atomically (warehouse-timezone-aware)
  v_local_date   := (now() AT TIME ZONE v_wh_tz)::date;
  v_display_date := to_char(now() AT TIME ZONE v_wh_tz, 'YYMMDD');

  INSERT INTO public.case_sequences (warehouse_id, sequence_date, last_sequence)
  VALUES (p_warehouse_id, v_local_date, 1)
  ON CONFLICT (warehouse_id, sequence_date)
  DO UPDATE SET last_sequence = public.case_sequences.last_sequence + 1
  RETURNING last_sequence INTO v_seq;

  v_case_number := 'WHC-' || v_wh_code || '-' || v_display_date || '-' || lpad(v_seq::text, 3, '0');

  -- 12. Insert case with mandatory client_request_id and calculated due_date
  INSERT INTO public.cases (
    case_number, title, description, category_id, subcategory_id,
    warehouse_id, area_id, location_id, asset_id, inspection_id,
    reporter_id, priority, status, has_operational_impact, requires_maintenance,
    source, due_date, client_request_id
  ) VALUES (
    v_case_number, p_title, p_description, p_category_id, p_subcategory_id,
    p_warehouse_id, p_area_id, p_location_id, p_asset_id, p_inspection_id,
    v_actor_id, p_priority, 'open', p_has_operational_impact, p_requires_maintenance,
    p_source, v_due_date, p_client_request_id
  )
  RETURNING id INTO v_case_id;

  -- 13. Log creation activity
  PERFORM public.log_case_activity(v_case_id, 'created', NULL, 'open', NULL);

  RETURN v_case_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_case(uuid, text, uuid, text, uuid, uuid, uuid, uuid, uuid, uuid, text, boolean, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_case(uuid, text, uuid, text, uuid, uuid, uuid, uuid, uuid, uuid, text, boolean, boolean, text) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. HARDEN MUTATION RPCS: REMOVE READ CAPABILITY (case.view_all) AS WRITE BYPASS
-- ═══════════════════════════════════════════════════════════════════════════

-- 4.1 update_case_progress: requires case.update_progress
CREATE OR REPLACE FUNCTION public.update_case_progress(
  p_case_id                uuid,
  p_description            text    DEFAULT NULL,
  p_corrective_action      text    DEFAULT NULL,
  p_preventive_action      text    DEFAULT NULL,
  p_root_cause_id          uuid    DEFAULT NULL,
  p_has_operational_impact boolean DEFAULT NULL,
  p_requires_maintenance   boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_case     record;
BEGIN
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT id, warehouse_id, status INTO v_case FROM public.cases WHERE id = p_case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Case % not found', p_case_id; END IF;

  -- Validate capability: MUST have case.update_progress (view_all is not a write permission)
  IF NOT public.has_capability(v_case.warehouse_id, 'case.update_progress') THEN
    RAISE EXCEPTION 'Permission denied: missing case.update_progress capability';
  END IF;

  -- Must be a participant (reporter or current assignee) or hold coordinator/admin roles that manage warehouse cases
  IF NOT (
    public.is_case_participant(p_case_id)
    OR public.has_capability(v_case.warehouse_id, 'case.assign')
  ) THEN
    RAISE EXCEPTION 'Permission denied: not assigned to this case';
  END IF;

  -- Cannot update a closed case
  IF v_case.status = 'closed' THEN
    RAISE EXCEPTION 'Cannot update a closed case. Use reopen_case first.';
  END IF;

  -- Apply only non-null fields
  UPDATE public.cases SET
    description            = COALESCE(p_description, description),
    corrective_action      = COALESCE(p_corrective_action, corrective_action),
    preventive_action      = COALESCE(p_preventive_action, preventive_action),
    root_cause_id          = COALESCE(p_root_cause_id, root_cause_id),
    has_operational_impact = COALESCE(p_has_operational_impact, has_operational_impact),
    requires_maintenance   = COALESCE(p_requires_maintenance, requires_maintenance)
  WHERE id = p_case_id;

  PERFORM public.log_case_activity(p_case_id, 'maintenance_updated', NULL, NULL,
    jsonb_build_object('actor_id', v_actor_id));
END;
$$;

REVOKE ALL ON FUNCTION public.update_case_progress(uuid, text, text, text, uuid, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_case_progress(uuid, text, text, text, uuid, boolean, boolean) TO authenticated;

-- 4.2 request_case_verification: requires case.request_verification & participant
CREATE OR REPLACE FUNCTION public.request_case_verification(p_case_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_case     record;
BEGIN
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT id, warehouse_id, status INTO v_case FROM public.cases WHERE id = p_case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Case % not found', p_case_id; END IF;

  IF NOT public.has_capability(v_case.warehouse_id, 'case.request_verification') THEN
    RAISE EXCEPTION 'Permission denied: missing case.request_verification capability';
  END IF;

  -- Must be assigned to case or hold case assignment management capability
  IF NOT (
    public.is_case_participant(p_case_id)
    OR public.has_capability(v_case.warehouse_id, 'case.assign')
  ) THEN
    RAISE EXCEPTION 'Permission denied: not a case participant';
  END IF;

  IF v_case.status NOT IN ('on_progress', 'waiting_repair') THEN
    RAISE EXCEPTION 'Can only request verification from on_progress or waiting_repair (current: %)', v_case.status;
  END IF;

  UPDATE public.cases SET status = 'waiting_verification' WHERE id = p_case_id;

  PERFORM public.log_case_activity(p_case_id, 'status_changed',
    v_case.status, 'waiting_verification', NULL);

  -- Notify warehouse verifiers (those with case.verify capability)
  INSERT INTO public.notifications (recipient_id, type, title, data)
  SELECT uw.user_id, 'waiting_verification',
         'Case menunggu verifikasi',
         jsonb_build_object('case_id', p_case_id)
  FROM public.user_warehouses uw
  JOIN public.role_capabilities rc ON rc.role_id = uw.role_id
  WHERE uw.warehouse_id = v_case.warehouse_id
    AND uw.is_active    = true
    AND rc.capability   = 'case.verify'
    AND uw.user_id     <> v_actor_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_case_verification(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_case_verification(uuid) TO authenticated;

-- 4.3 add_case_comment: requires participant or case management capability
CREATE OR REPLACE FUNCTION public.add_case_comment(
  p_case_id     uuid,
  p_content     text,
  p_is_internal boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id   uuid := auth.uid();
  v_case       record;
  v_comment_id uuid;
BEGIN
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_content IS NULL OR trim(p_content) = '' THEN
    RAISE EXCEPTION 'Comment content cannot be empty';
  END IF;

  SELECT id, warehouse_id, status INTO v_case FROM public.cases WHERE id = p_case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Case % not found', p_case_id; END IF;

  -- Must be case participant or hold active management capabilities in this warehouse
  IF NOT (
    public.is_case_participant(p_case_id)
    OR public.has_capability(v_case.warehouse_id, 'case.assign')
    OR public.has_capability(v_case.warehouse_id, 'case.verify')
    OR public.has_capability(v_case.warehouse_id, 'case.update_progress')
  ) THEN
    RAISE EXCEPTION 'Permission denied: not a case participant or authorized manager';
  END IF;

  IF v_case.status = 'closed' THEN
    RAISE EXCEPTION 'Cannot comment on a closed case';
  END IF;

  INSERT INTO public.case_comments (case_id, author_id, content, is_internal)
  VALUES (p_case_id, v_actor_id, p_content, p_is_internal)
  RETURNING id INTO v_comment_id;

  PERFORM public.log_case_activity(p_case_id, 'commented', NULL, NULL,
    jsonb_build_object('comment_id', v_comment_id, 'is_internal', p_is_internal));

  RETURN v_comment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.add_case_comment(uuid, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_case_comment(uuid, text, boolean) TO authenticated;

-- 4.4 add_case_evidence: requires evidence.upload AND participant/management capability
CREATE OR REPLACE FUNCTION public.add_case_evidence(
  p_case_id   uuid,
  p_phase     text,
  p_file_url  text,
  p_file_name text DEFAULT NULL,
  p_file_size int DEFAULT NULL,
  p_mime_type text DEFAULT NULL,
  p_caption   text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id    uuid := auth.uid();
  v_case        record;
  v_evidence_id uuid;
BEGIN
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_phase NOT IN ('before', 'during', 'after') THEN
    RAISE EXCEPTION 'Invalid phase: must be before/during/after';
  END IF;
  IF p_file_url IS NULL OR trim(p_file_url) = '' THEN
    RAISE EXCEPTION 'file_url is required';
  END IF;

  SELECT id, warehouse_id, status INTO v_case FROM public.cases WHERE id = p_case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Case % not found', p_case_id; END IF;

  IF NOT public.has_capability(v_case.warehouse_id, 'evidence.upload') THEN
    RAISE EXCEPTION 'Permission denied: missing evidence.upload capability';
  END IF;

  -- Must be case participant or hold active management capabilities
  IF NOT (
    public.is_case_participant(p_case_id)
    OR public.has_capability(v_case.warehouse_id, 'case.assign')
    OR public.has_capability(v_case.warehouse_id, 'case.verify')
    OR public.has_capability(v_case.warehouse_id, 'case.update_progress')
  ) THEN
    RAISE EXCEPTION 'Permission denied: not authorized to add evidence to this case';
  END IF;

  IF v_case.status = 'closed' THEN
    RAISE EXCEPTION 'Cannot add evidence to a closed case';
  END IF;

  INSERT INTO public.case_evidences (case_id, uploader_id, phase, file_url, file_name, file_size, mime_type, caption)
  VALUES (p_case_id, v_actor_id, p_phase, p_file_url, p_file_name, p_file_size, p_mime_type, p_caption)
  RETURNING id INTO v_evidence_id;

  PERFORM public.log_case_activity(p_case_id, 'evidence_added', NULL, NULL,
    jsonb_build_object('evidence_id', v_evidence_id, 'phase', p_phase));

  RETURN v_evidence_id;
END;
$$;

REVOKE ALL ON FUNCTION public.add_case_evidence(uuid, text, text, text, int, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_case_evidence(uuid, text, text, text, int, text, text) TO authenticated;
