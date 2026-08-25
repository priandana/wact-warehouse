-- 035_harden_rls_functions_active_profile.sql
-- Harden core RLS authorization helper functions to strictly require active profile status (profiles.is_active = true).
--
-- Security Target:
-- Prevent active-session or JWT-bearing globally deactivated users (profiles.is_active = false)
-- and inactive Super Admins from resolving warehouse authority, capabilities, or operational data via PostgREST / RLS.

-- ── 1. Harden is_super_admin() ──────────────────────────────────────────────
-- Super Admin authority requires BOTH is_super_admin = true AND is_active = true.

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() AND is_active = true),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;

-- ── 2. Harden get_user_warehouse_ids() ──────────────────────────────────────
-- Inactive profiles receive an empty array (zero authorized warehouses).
-- Active Super Admins receive all active warehouses.
-- Active normal users receive their active warehouse memberships.

CREATE OR REPLACE FUNCTION public.get_user_warehouse_ids()
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT CASE
    -- 1. Inactive profile fails closed immediately
    WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active = true)
    THEN ARRAY[]::uuid[]

    -- 2. Active Super Admin receives all active warehouses
    WHEN (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() AND is_active = true)
    THEN ARRAY(SELECT id FROM public.warehouses WHERE is_active = true)

    -- 3. Active normal user receives active warehouse memberships
    ELSE ARRAY(
      SELECT DISTINCT uw.warehouse_id
      FROM public.user_warehouses uw
      JOIN public.profiles p ON p.id = uw.user_id
      WHERE uw.user_id = auth.uid()
        AND uw.is_active = true
        AND p.is_active = true
    )
  END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_warehouse_ids() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_user_warehouse_ids() FROM PUBLIC, anon;

-- ── 3. Harden has_capability() ──────────────────────────────────────────────
-- Capability resolution requires active profile (profiles.is_active = true).
-- Active Super Admins resolve true.
-- Active normal users resolve capabilities from active roles in active warehouse assignments.

CREATE OR REPLACE FUNCTION public.has_capability(
  p_warehouse_id uuid,
  p_capability   text
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    -- Inactive profile fails closed immediately
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active = true)
    AND (
      -- Active Super Admin always has capability
      COALESCE((SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() AND is_active = true), false)
      OR EXISTS (
        SELECT 1
        FROM public.user_warehouses uw
        JOIN public.profiles p ON p.id = uw.user_id
        JOIN public.role_capabilities rc ON rc.role_id = uw.role_id
        WHERE uw.user_id      = auth.uid()
          AND uw.warehouse_id = p_warehouse_id
          AND uw.is_active    = true
          AND p.is_active     = true
          AND rc.capability   = p_capability
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.has_capability(uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.has_capability(uuid, text) FROM PUBLIC, anon;

-- ── 4. Harden is_case_participant() ─────────────────────────────────────────
-- Participant checks require active profile.

CREATE OR REPLACE FUNCTION public.is_case_participant(p_case_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active = true)
    AND (
      EXISTS (
        SELECT 1 FROM public.cases
        WHERE id = p_case_id AND reporter_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.case_assignments
        WHERE case_id = p_case_id
          AND assignee_id = auth.uid()
          AND is_current = true
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_case_participant(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_case_participant(uuid) FROM PUBLIC, anon;

-- ── 5. Harden can_view_case_assignment() ────────────────────────────────────
-- Case assignment view check requires active profile.

CREATE OR REPLACE FUNCTION public.can_view_case_assignment(
  p_case_id     uuid,
  p_assignee_id uuid,
  p_assigned_by uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active = true)
    AND (
      p_assignee_id = auth.uid()
      OR p_assigned_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.cases c
        WHERE c.id = p_case_id
          AND c.warehouse_id = ANY(public.get_user_warehouse_ids())
          AND (
            public.has_capability(c.warehouse_id, 'case.view_all')
            OR c.reporter_id = auth.uid()
          )
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_view_case_assignment(uuid, uuid, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.can_view_case_assignment(uuid, uuid, uuid) FROM PUBLIC, anon;
