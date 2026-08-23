-- 027_fix_rls_recursion.sql
-- Fix mutual RLS recursion between `cases` and `case_assignments`.
--
-- Cause of Error (42P17):
-- `cases_select` queried `case_assignments` table directly (SECURITY INVOKER),
-- which triggered `case_assign_select`, which queried `cases` table directly,
-- causing infinite recursion.
--
-- Solution:
-- Use STABLE SECURITY DEFINER helper functions for cross-table ownership checks:
-- 1. `is_case_assignee(case_id, user_id)` — used by `cases_select` policy
-- 2. `can_view_case_assignment(case_id, assignee_id, assigned_by)` — used by `case_assign_select` policy
--
-- Because both helpers run with SECURITY DEFINER, table queries inside them
-- bypass RLS evaluation for that lookup, preventing any recursion cycles.

-- ── 1. Helper Functions (SECURITY DEFINER) ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_case_assignee(p_case_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.case_assignments
    WHERE case_id = p_case_id
      AND assignee_id = p_user_id
      AND is_current = true
  );
$$;

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
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_case_assignee(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_case_assignment(uuid, uuid, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_case_assignee(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_view_case_assignment(uuid, uuid, uuid) FROM PUBLIC, anon;

-- ── 2. Re-create cases_select Policy (Zero Recursion) ─────────────────────

DROP POLICY IF EXISTS cases_select ON public.cases;

CREATE POLICY cases_select ON public.cases FOR SELECT USING (
  warehouse_id = ANY(public.get_user_warehouse_ids())
  AND (
    public.has_capability(warehouse_id, 'case.view_all')
    OR (
      public.has_capability(warehouse_id, 'case.view_assigned')
      AND (
        reporter_id = auth.uid()
        OR public.is_case_assignee(id, auth.uid())
      )
    )
    OR (
      public.has_capability(warehouse_id, 'case.view_own')
      AND reporter_id = auth.uid()
    )
  )
);

-- ── 3. Re-create case_assign_select Policy (Zero Recursion) ────────────────

DROP POLICY IF EXISTS case_assign_select ON public.case_assignments;

CREATE POLICY case_assign_select ON public.case_assignments FOR SELECT USING (
  public.can_view_case_assignment(case_id, assignee_id, assigned_by)
);
