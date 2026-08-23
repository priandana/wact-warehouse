-- 016_rls_functions.sql
-- Core RLS helper functions — SECURITY DEFINER with hardened search_path
-- Depends on: profiles (002), warehouses (004), user_warehouses (004),
--             role_capabilities (003), case_assignments (013)

-- ── get_user_warehouse_ids ────────────────────────────────────────────────
-- Returns all warehouse_ids accessible to current authenticated user.
-- Super admins get all active warehouses.

CREATE OR REPLACE FUNCTION public.get_user_warehouse_ids()
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT CASE
    WHEN (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())
    THEN ARRAY(SELECT id FROM public.warehouses WHERE is_active = true)
    ELSE ARRAY(
      SELECT DISTINCT warehouse_id
      FROM public.user_warehouses
      WHERE user_id = auth.uid() AND is_active = true
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.get_user_warehouse_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_warehouse_ids() TO authenticated;

-- ── has_capability ────────────────────────────────────────────────────────
-- Returns true if current user holds the given capability in the given warehouse.
-- Unions across ALL active roles the user holds in that warehouse.
-- Super admins always return true.
-- STABLE: PostgreSQL may cache result within a single query (improves RLS perf).

CREATE OR REPLACE FUNCTION public.has_capability(
  p_warehouse_id uuid,
  p_capability   text
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.user_warehouses uw
      JOIN public.role_capabilities rc ON rc.role_id = uw.role_id
      WHERE uw.user_id      = auth.uid()
        AND uw.warehouse_id = p_warehouse_id
        AND uw.is_active    = true
        AND rc.capability   = p_capability
    );
$$;

REVOKE ALL ON FUNCTION public.has_capability(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_capability(uuid, text) TO authenticated;

-- ── is_case_participant ───────────────────────────────────────────────────
-- Returns true if current user is reporter OR current assignee of the case.
-- Used in child table RLS policies.

CREATE OR REPLACE FUNCTION public.is_case_participant(p_case_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.cases
      WHERE id = p_case_id AND reporter_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.case_assignments
      WHERE case_id = p_case_id
        AND assignee_id = auth.uid()
        AND is_current = true
    );
$$;

REVOKE ALL ON FUNCTION public.is_case_participant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_case_participant(uuid) TO authenticated;

-- ── log_case_activity ─────────────────────────────────────────────────────
-- Internal helper for activity logging — called from controlled mutation RPCs.
-- Actor always derived from auth.uid(), never from caller parameter.

CREATE OR REPLACE FUNCTION public.log_case_activity(
  p_case_id    uuid,
  p_action     text,
  p_from_status text DEFAULT NULL,
  p_to_status   text DEFAULT NULL,
  p_metadata    jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.case_activities (
    case_id, actor_id, action, from_status, to_status, metadata
  ) VALUES (
    p_case_id, auth.uid(), p_action, p_from_status, p_to_status, p_metadata
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_case_activity(uuid, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_case_activity(uuid, text, text, text, jsonb) TO authenticated;

-- ── send_notification ─────────────────────────────────────────────────────
-- Internal helper for sending in-app notifications from server-side RPCs.

CREATE OR REPLACE FUNCTION public.send_notification(
  p_recipient_id uuid,
  p_type         text,
  p_title        text,
  p_body         text DEFAULT NULL,
  p_data         jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.notifications (recipient_id, type, title, body, data)
  VALUES (p_recipient_id, p_type, p_title, p_body, p_data)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.send_notification(uuid, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_notification(uuid, text, text, text, jsonb) TO authenticated;
