-- 028_fix_profiles_rls_recursion.sql
-- Fix infinite RLS recursion on `profiles` table.
--
-- Cause:
-- `profiles_select` policy in 022 used `(SELECT is_super_admin FROM public.profiles p2 WHERE p2.id = auth.uid())`
-- directly in a SECURITY INVOKER context. When any client queried `profiles`, PostgreSQL
-- evaluated this subquery which triggered `profiles_select` recursively (Error 42P17).
--
-- Solution:
-- Use a STABLE SECURITY DEFINER helper function `is_super_admin()` to read the super_admin flag
-- without triggering RLS evaluation on `profiles`.

-- ── 1. Create Helper Function (SECURITY DEFINER) ───────────────────────────

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;

-- ── 2. Re-create profiles_select Policy (Zero Recursion) ───────────────────

DROP POLICY IF EXISTS profiles_select ON public.profiles;

CREATE POLICY profiles_select ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR public.is_super_admin()
  );
