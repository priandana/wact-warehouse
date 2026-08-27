-- ══════════════════════════════════════════════════════════════════════════
-- Migration 039: Harden public.assign_case() Target PIC Eligibility
-- ══════════════════════════════════════════════════════════════════════════
-- Security Target:
-- Enforce that target assignee (p_assignee_id) MUST satisfy:
--   1. profiles.id = p_assignee_id AND profiles.is_active = true
--   2. user_warehouses.user_id = p_assignee_id AND user_warehouses.warehouse_id = v_case.warehouse_id AND user_warehouses.is_active = true
--   3. roles.id = user_warehouses.role_id AND roles.name = 'pic_maintenance'
-- Multi-role users (e.g. reporter + qc_leader + pic_maintenance) remain eligible
-- as long as at least one active membership in the case warehouse is pic_maintenance.
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

  -- 1. Load case (RLS already filters rows — but we also check capability explicitly)
  SELECT id, warehouse_id, status, case_number, title
    INTO v_case FROM public.cases WHERE id = p_case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Case % not found', p_case_id; END IF;

  -- 2. Validate caller assignment capability
  IF NOT public.has_capability(v_case.warehouse_id, 'case.assign') THEN
    RAISE EXCEPTION 'Permission denied: missing case.assign capability';
  END IF;

  -- 3. Cannot assign a closed case
  IF v_case.status = 'closed' THEN
    RAISE EXCEPTION 'Cannot assign a closed case';
  END IF;

  -- 4. Authoritative Target PIC Validation:
  --    Target user must have an active profile AND active 'pic_maintenance' membership in this warehouse.
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_warehouses uw
    JOIN public.profiles p ON p.id = uw.user_id
    JOIN public.roles r ON r.id = uw.role_id
    WHERE uw.user_id = p_assignee_id
      AND uw.warehouse_id = v_case.warehouse_id
      AND uw.is_active = true
      AND p.is_active = true
      AND r.name = 'pic_maintenance'
  ) THEN
    RAISE EXCEPTION 'Target user % is not an active PIC / Maintenance member of warehouse %', p_assignee_id, v_case.warehouse_id;
  END IF;

  SELECT full_name INTO v_assignee FROM public.profiles WHERE id = p_assignee_id;

  -- 5. Unset current assignment
  UPDATE public.case_assignments
     SET is_current = false, unassigned_at = now()
   WHERE case_id = p_case_id AND is_current = true;

  -- 6. Insert new assignment
  INSERT INTO public.case_assignments (case_id, assignee_id, assigned_by, is_current)
  VALUES (p_case_id, p_assignee_id, v_actor_id, true);

  -- 7. Transition to on_progress if open or reopened
  IF v_case.status IN ('open', 'reopened') THEN
    UPDATE public.cases SET status = 'on_progress' WHERE id = p_case_id;
    PERFORM public.log_case_activity(p_case_id, 'status_changed', v_case.status, 'on_progress',
      jsonb_build_object('reason', 'assigned'));
  END IF;

  -- 8. Log assignment activity
  PERFORM public.log_case_activity(p_case_id, 'assigned', NULL, NULL,
    jsonb_build_object('assignee_id', p_assignee_id, 'assignee_name', v_assignee.full_name));

  -- 9. Notify assignee
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
GRANT EXECUTE ON FUNCTION public.assign_case(uuid, uuid) TO authenticated, service_role;
