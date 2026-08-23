-- 021_controlled_mutation_rpcs.sql
-- All controlled case mutation RPCs.
-- Each function:
--   - derives actor from auth.uid() ONLY — never trusts caller-supplied identity
--   - validates warehouse access
--   - validates capability
--   - validates current state / allowed transition
--   - performs multi-step writes in an implicit transaction (plpgsql function = single txn)
--   - logs activity
--   - sends in-app notifications
--   - uses SECURITY DEFINER + SET search_path = public
--   - restricts EXECUTE to authenticated only

-- ══════════════════════════════════════════════════════════════════════════
-- create_case
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.create_case(
  p_warehouse_id          uuid,
  p_title                 text,
  p_description           text DEFAULT NULL,
  p_category_id           uuid DEFAULT NULL,
  p_subcategory_id        uuid DEFAULT NULL,
  p_area_id               uuid DEFAULT NULL,
  p_location_id           uuid DEFAULT NULL,
  p_asset_id              uuid DEFAULT NULL,
  p_inspection_id         uuid DEFAULT NULL,
  p_priority              text DEFAULT 'medium',
  p_has_operational_impact boolean DEFAULT false,
  p_requires_maintenance  boolean DEFAULT false,
  p_source                text DEFAULT 'direct',
  -- case_number is generated internally — caller cannot supply it
  p_due_date              timestamptz DEFAULT NULL
)
RETURNS uuid   -- returns new case id
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id     uuid := auth.uid();
  v_case_id      uuid;
  v_case_number  text;
  v_wh_code      text;
  v_wh_tz        text;
  v_seq          int;
  v_display_date text;
  v_local_date   date;
BEGIN
  -- 1. Validate actor is authenticated
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Validate capability
  IF NOT public.has_capability(p_warehouse_id, 'case.create') THEN
    RAISE EXCEPTION 'Permission denied: missing case.create capability in warehouse %', p_warehouse_id;
  END IF;

  -- 3. Validate warehouse is active
  SELECT code, timezone INTO v_wh_code, v_wh_tz
    FROM public.warehouses
   WHERE id = p_warehouse_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Warehouse % not found or inactive', p_warehouse_id;
  END IF;

  -- 4. Validate priority
  IF p_priority NOT IN ('low', 'medium', 'high', 'critical') THEN
    RAISE EXCEPTION 'Invalid priority: %', p_priority;
  END IF;

  -- 5. Validate source
  IF p_source NOT IN ('direct', 'inspection') THEN
    RAISE EXCEPTION 'Invalid source: %', p_source;
  END IF;

  -- 6. Validate subcategory belongs to category (if both provided)
  IF p_subcategory_id IS NOT NULL AND p_category_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.case_subcategories
      WHERE id = p_subcategory_id AND category_id = p_category_id
    ) THEN
      RAISE EXCEPTION 'Subcategory % does not belong to category %', p_subcategory_id, p_category_id;
    END IF;
  END IF;

  -- 7. Validate area/location/asset/inspection belong to same warehouse
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

  -- 8. Generate case number atomically
  -- Use warehouse timezone for the date portion
  v_local_date   := (now() AT TIME ZONE v_wh_tz)::date;
  v_display_date := to_char(now() AT TIME ZONE v_wh_tz, 'YYMMDD');

  INSERT INTO public.case_sequences (warehouse_id, sequence_date, last_sequence)
  VALUES (p_warehouse_id, v_local_date, 1)
  ON CONFLICT (warehouse_id, sequence_date)
  DO UPDATE SET last_sequence = public.case_sequences.last_sequence + 1
  RETURNING last_sequence INTO v_seq;

  v_case_number := 'WHC-' || v_wh_code || '-' || v_display_date || '-' || lpad(v_seq::text, 3, '0');

  -- 9. Insert case
  INSERT INTO public.cases (
    case_number, title, description, category_id, subcategory_id,
    warehouse_id, area_id, location_id, asset_id, inspection_id,
    reporter_id, priority, status, has_operational_impact, requires_maintenance,
    source, due_date
  ) VALUES (
    v_case_number, p_title, p_description, p_category_id, p_subcategory_id,
    p_warehouse_id, p_area_id, p_location_id, p_asset_id, p_inspection_id,
    v_actor_id, p_priority, 'open', p_has_operational_impact, p_requires_maintenance,
    p_source, p_due_date
  )
  RETURNING id INTO v_case_id;

  -- 10. Log activity
  PERFORM public.log_case_activity(v_case_id, 'created', NULL, 'open', NULL);

  RETURN v_case_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_case(uuid,text,text,uuid,uuid,uuid,uuid,uuid,uuid,text,boolean,boolean,text,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_case(uuid,text,text,uuid,uuid,uuid,uuid,uuid,uuid,text,boolean,boolean,text,timestamptz) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- assign_case
-- Atomically: unset previous assignment + insert new + log + notify
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.assign_case(
  p_case_id    uuid,
  p_assignee_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id   uuid := auth.uid();
  v_case       record;
  v_assignee   record;
BEGIN
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Load case (RLS already filters rows — but we also check capability explicitly)
  SELECT id, warehouse_id, status, case_number, title
    INTO v_case FROM public.cases WHERE id = p_case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Case % not found', p_case_id; END IF;

  -- Validate capability
  IF NOT public.has_capability(v_case.warehouse_id, 'case.assign') THEN
    RAISE EXCEPTION 'Permission denied: missing case.assign capability';
  END IF;

  -- Cannot assign a closed case
  IF v_case.status = 'closed' THEN
    RAISE EXCEPTION 'Cannot assign a closed case';
  END IF;

  -- Validate assignee is an active member of the same warehouse
  IF NOT EXISTS (
    SELECT 1 FROM public.user_warehouses
    WHERE user_id = p_assignee_id AND warehouse_id = v_case.warehouse_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Assignee % is not an active member of warehouse %', p_assignee_id, v_case.warehouse_id;
  END IF;

  SELECT full_name INTO v_assignee FROM public.profiles WHERE id = p_assignee_id;

  -- Unset current assignment
  UPDATE public.case_assignments
     SET is_current = false, unassigned_at = now()
   WHERE case_id = p_case_id AND is_current = true;

  -- Insert new assignment
  INSERT INTO public.case_assignments (case_id, assignee_id, assigned_by, is_current)
  VALUES (p_case_id, p_assignee_id, v_actor_id, true);

  -- Transition to on_progress if open or reopened
  IF v_case.status IN ('open', 'reopened') THEN
    UPDATE public.cases SET status = 'on_progress' WHERE id = p_case_id;
    PERFORM public.log_case_activity(p_case_id, 'status_changed', v_case.status, 'on_progress',
      jsonb_build_object('reason', 'assigned'));
  END IF;

  -- Log assignment activity
  PERFORM public.log_case_activity(p_case_id, 'assigned', NULL, NULL,
    jsonb_build_object('assignee_id', p_assignee_id, 'assignee_name', v_assignee.full_name));

  -- Notify assignee
  PERFORM public.send_notification(
    p_assignee_id,
    'case_assigned',
    'Case ditugaskan ke kamu',
    v_case.case_number || ': ' || v_case.title,
    jsonb_build_object('case_id', p_case_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.assign_case(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_case(uuid, uuid) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- update_case_progress
-- PIC/coordinator can update description, notes, maintenance fields.
-- CANNOT change: reporter_id, warehouse_id, priority (needs change_case_priority),
--                due_date (needs override_case_due_date), closed_at, root_cause
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.update_case_progress(
  p_case_id             uuid,
  p_description         text DEFAULT NULL,
  p_corrective_action   text DEFAULT NULL,
  p_preventive_action   text DEFAULT NULL,
  p_root_cause_id       uuid DEFAULT NULL,
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

  -- Validate capability
  IF NOT (
    public.has_capability(v_case.warehouse_id, 'case.update_progress')
    OR public.has_capability(v_case.warehouse_id, 'case.view_all')
  ) THEN
    RAISE EXCEPTION 'Permission denied: missing case.update_progress capability';
  END IF;

  -- Must be assigned to case (for PIC) or have view_all
  IF NOT (
    public.has_capability(v_case.warehouse_id, 'case.view_all')
    OR public.is_case_participant(p_case_id)
  ) THEN
    RAISE EXCEPTION 'Permission denied: not a case participant';
  END IF;

  -- Cannot update a closed case
  IF v_case.status = 'closed' THEN
    RAISE EXCEPTION 'Cannot update a closed case. Use reopen_case first.';
  END IF;

  -- Apply only non-null fields
  UPDATE public.cases SET
    description           = COALESCE(p_description, description),
    corrective_action     = COALESCE(p_corrective_action, corrective_action),
    preventive_action     = COALESCE(p_preventive_action, preventive_action),
    root_cause_id         = COALESCE(p_root_cause_id, root_cause_id),
    has_operational_impact = COALESCE(p_has_operational_impact, has_operational_impact),
    requires_maintenance   = COALESCE(p_requires_maintenance, requires_maintenance)
  WHERE id = p_case_id;

  PERFORM public.log_case_activity(p_case_id, 'maintenance_updated', NULL, NULL,
    jsonb_build_object('actor_id', v_actor_id));
END;
$$;

REVOKE ALL ON FUNCTION public.update_case_progress(uuid,text,text,text,uuid,boolean,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_case_progress(uuid,text,text,text,uuid,boolean,boolean) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- change_case_priority
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.change_case_priority(
  p_case_id uuid,
  p_priority text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id   uuid := auth.uid();
  v_case       record;
  v_old_priority text;
BEGIN
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_priority NOT IN ('low', 'medium', 'high', 'critical') THEN
    RAISE EXCEPTION 'Invalid priority: %', p_priority;
  END IF;

  SELECT id, warehouse_id, status, priority INTO v_case FROM public.cases WHERE id = p_case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Case % not found', p_case_id; END IF;

  IF NOT public.has_capability(v_case.warehouse_id, 'case.change_priority') THEN
    RAISE EXCEPTION 'Permission denied: missing case.change_priority capability';
  END IF;

  IF v_case.status = 'closed' THEN
    RAISE EXCEPTION 'Cannot change priority of a closed case';
  END IF;

  v_old_priority := v_case.priority;
  UPDATE public.cases SET priority = p_priority WHERE id = p_case_id;

  PERFORM public.log_case_activity(p_case_id, 'priority_changed', NULL, NULL,
    jsonb_build_object('from', v_old_priority, 'to', p_priority));
END;
$$;

REVOKE ALL ON FUNCTION public.change_case_priority(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.change_case_priority(uuid, text) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- override_case_due_date
-- Requires reason (NOT NULL enforced here + in app)
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.override_case_due_date(
  p_case_id    uuid,
  p_new_due_date timestamptz,
  p_reason     text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id     uuid := auth.uid();
  v_case         record;
  v_old_due_date timestamptz;
BEGIN
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Reason is required when overriding due date';
  END IF;
  IF p_new_due_date IS NULL THEN
    RAISE EXCEPTION 'New due date cannot be null';
  END IF;

  SELECT id, warehouse_id, status, due_date INTO v_case FROM public.cases WHERE id = p_case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Case % not found', p_case_id; END IF;

  IF NOT public.has_capability(v_case.warehouse_id, 'case.override_due_date') THEN
    RAISE EXCEPTION 'Permission denied: missing case.override_due_date capability';
  END IF;

  IF v_case.status = 'closed' THEN
    RAISE EXCEPTION 'Cannot change due date of a closed case';
  END IF;

  v_old_due_date := v_case.due_date;

  -- Update due date
  UPDATE public.cases SET due_date = p_new_due_date WHERE id = p_case_id;

  -- Record in audit trail (reason stored here permanently)
  INSERT INTO public.due_date_changes (case_id, changed_by, previous_due_date, new_due_date, reason)
  VALUES (p_case_id, v_actor_id, COALESCE(v_old_due_date, now()), p_new_due_date, p_reason);

  PERFORM public.log_case_activity(p_case_id, 'due_date_overridden', NULL, NULL,
    jsonb_build_object('from', v_old_due_date, 'to', p_new_due_date, 'reason', p_reason));
END;
$$;

REVOKE ALL ON FUNCTION public.override_case_due_date(uuid, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.override_case_due_date(uuid, timestamptz, text) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- request_case_verification
-- PIC requests coordinator/QC to verify the fix.
-- Allowed transitions: on_progress → waiting_verification
--                      waiting_repair → waiting_verification
-- ══════════════════════════════════════════════════════════════════════════
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

  -- Must be assigned to case
  IF NOT (public.is_case_participant(p_case_id) OR public.has_capability(v_case.warehouse_id, 'case.view_all')) THEN
    RAISE EXCEPTION 'Permission denied: not a case participant';
  END IF;

  IF v_case.status NOT IN ('on_progress', 'waiting_repair') THEN
    RAISE EXCEPTION 'Can only request verification from on_progress or waiting_repair (current: %)', v_case.status;
  END IF;

  UPDATE public.cases SET status = 'waiting_verification' WHERE id = p_case_id;

  PERFORM public.log_case_activity(p_case_id, 'status_changed',
    v_case.status, 'waiting_verification', NULL);

  -- Notify warehouse coordinators (those with case.verify capability)
  -- Notification is sent to the reporter as acknowledgement
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

-- ══════════════════════════════════════════════════════════════════════════
-- verify_case
-- Closes the case (or rejects → back to on_progress).
-- Verifier MUST NOT be the PIC/assignee.
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.verify_case(
  p_case_id  uuid,
  p_approved boolean,
  p_note     text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id  uuid := auth.uid();
  v_case      record;
  v_assignee  uuid;
BEGIN
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT id, warehouse_id, status, reporter_id INTO v_case FROM public.cases WHERE id = p_case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Case % not found', p_case_id; END IF;

  IF NOT public.has_capability(v_case.warehouse_id, 'case.verify') THEN
    RAISE EXCEPTION 'Permission denied: missing case.verify capability';
  END IF;

  IF v_case.status <> 'waiting_verification' THEN
    RAISE EXCEPTION 'Case is not in waiting_verification status (current: %)', v_case.status;
  END IF;

  -- Verifier cannot be the current assignee
  SELECT assignee_id INTO v_assignee
    FROM public.case_assignments
   WHERE case_id = p_case_id AND is_current = true;

  IF v_assignee IS NOT NULL AND v_assignee = v_actor_id THEN
    RAISE EXCEPTION 'Verifier cannot be the current assignee (PIC cannot verify own work)';
  END IF;

  IF p_approved THEN
    -- Close case
    UPDATE public.cases
       SET status = 'closed', closed_at = now()
     WHERE id = p_case_id;

    PERFORM public.log_case_activity(p_case_id, 'verified',
      'waiting_verification', 'closed',
      jsonb_build_object('note', p_note, 'verifier_id', v_actor_id));

    -- Notify reporter and assignee
    PERFORM public.send_notification(v_case.reporter_id, 'case_closed',
      'Case diselesaikan', p_note, jsonb_build_object('case_id', p_case_id));
    IF v_assignee IS NOT NULL AND v_assignee <> v_case.reporter_id THEN
      PERFORM public.send_notification(v_assignee, 'case_closed',
        'Case diselesaikan', p_note, jsonb_build_object('case_id', p_case_id));
    END IF;
  ELSE
    -- Reject: back to on_progress
    UPDATE public.cases SET status = 'on_progress' WHERE id = p_case_id;

    PERFORM public.log_case_activity(p_case_id, 'verification_failed',
      'waiting_verification', 'on_progress',
      jsonb_build_object('note', p_note, 'verifier_id', v_actor_id));

    -- Notify assignee
    IF v_assignee IS NOT NULL THEN
      PERFORM public.send_notification(v_assignee, 'verification_failed',
        'Verifikasi ditolak', p_note, jsonb_build_object('case_id', p_case_id));
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_case(uuid, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_case(uuid, boolean, text) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- reopen_case
-- CLOSED is immutable to normal edits. Reopening requires:
--   - case.reopen capability
--   - a reason (NOT NULL)
--   - audit log entry
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.reopen_case(
  p_case_id uuid,
  p_reason  text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_case     record;
  v_assignee uuid;
BEGIN
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Reason is required when reopening a case';
  END IF;

  SELECT id, warehouse_id, status, reporter_id INTO v_case FROM public.cases WHERE id = p_case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Case % not found', p_case_id; END IF;

  IF NOT public.has_capability(v_case.warehouse_id, 'case.reopen') THEN
    RAISE EXCEPTION 'Permission denied: missing case.reopen capability';
  END IF;

  IF v_case.status <> 'closed' THEN
    RAISE EXCEPTION 'Case must be closed to reopen it (current: %)', v_case.status;
  END IF;

  -- Reopen to 'reopened' status
  UPDATE public.cases
     SET status = 'reopened', closed_at = NULL
   WHERE id = p_case_id;

  PERFORM public.log_case_activity(p_case_id, 'reopened',
    'closed', 'reopened',
    jsonb_build_object('reason', p_reason, 'actor_id', v_actor_id));

  -- Notify reporter
  PERFORM public.send_notification(v_case.reporter_id, 'reopened',
    'Case dibuka kembali', p_reason, jsonb_build_object('case_id', p_case_id));

  -- Notify current assignee if exists
  SELECT assignee_id INTO v_assignee
    FROM public.case_assignments
   WHERE case_id = p_case_id AND is_current = true;
  IF v_assignee IS NOT NULL AND v_assignee <> v_case.reporter_id THEN
    PERFORM public.send_notification(v_assignee, 'reopened',
      'Case dibuka kembali', p_reason, jsonb_build_object('case_id', p_case_id));
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.reopen_case(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reopen_case(uuid, text) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- add_case_comment (controlled — validates participant + open status)
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.add_case_comment(
  p_case_id    uuid,
  p_content    text,
  p_is_internal boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_case     record;
  v_comment_id uuid;
BEGIN
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_content IS NULL OR trim(p_content) = '' THEN
    RAISE EXCEPTION 'Comment content cannot be empty';
  END IF;

  SELECT id, warehouse_id, status INTO v_case FROM public.cases WHERE id = p_case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Case % not found', p_case_id; END IF;

  IF NOT (public.is_case_participant(p_case_id) OR public.has_capability(v_case.warehouse_id, 'case.view_all')) THEN
    RAISE EXCEPTION 'Permission denied: not a case participant';
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

-- ══════════════════════════════════════════════════════════════════════════
-- add_case_evidence (controlled — validates participant + capability)
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.add_case_evidence(
  p_case_id  uuid,
  p_phase    text,
  p_file_url text,
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
  v_actor_id   uuid := auth.uid();
  v_case       record;
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

  IF NOT (public.is_case_participant(p_case_id) OR public.has_capability(v_case.warehouse_id, 'case.view_all')) THEN
    RAISE EXCEPTION 'Permission denied: not a case participant';
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

REVOKE ALL ON FUNCTION public.add_case_evidence(uuid,text,text,text,int,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_case_evidence(uuid,text,text,text,int,text,text) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- mark_notifications_read
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_notification_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
     SET is_read = true, read_at = now()
   WHERE id = ANY(p_notification_ids)
     AND recipient_id = auth.uid()  -- never trust caller to specify recipient
     AND is_read = false;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_notifications_read(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) TO authenticated;
