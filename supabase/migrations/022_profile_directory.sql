-- 022_profile_directory.sql
-- Safe profile directory view and hardened profile RLS.
--
-- Problem: exposing the full `profiles` row to all authenticated users
-- leaks sensitive fields (employee_id, phone, is_super_admin, is_active).
--
-- Solution:
--   1. Create a `profile_directory` VIEW with only UI-safe fields.
--   2. Harden `profiles` RLS: only owner + admin can read full row.
--   3. All UI display (reporter name, assignee name, etc.) uses the view.

-- ── 1. Profile Directory View ─────────────────────────────────────────────
-- Exposes only UI-safe fields: id, full_name, avatar_url.
-- No: employee_id, phone, is_super_admin, is_active.

CREATE OR REPLACE VIEW public.profile_directory AS
  SELECT
    id,
    full_name,
    avatar_url
  FROM public.profiles;

-- Grant SELECT on view to authenticated users
GRANT SELECT ON public.profile_directory TO authenticated;

-- ── 2. Harden profiles RLS ────────────────────────────────────────────────
-- Drop the permissive "all authenticated" policy from 002.
-- Replace with: owner + super_admin only for the full profiles table.

DROP POLICY IF EXISTS profiles_select ON public.profiles;

-- Full row: only own profile or super_admin
CREATE POLICY profiles_select ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR (SELECT is_super_admin FROM public.profiles p2 WHERE p2.id = auth.uid())
  );

-- ── 3. Note for developers ────────────────────────────────────────────────
-- Use public.profile_directory for:
--   - reporter name display in case lists
--   - assignee name display
--   - comment author name
--   - notification recipient name
--
-- Use public.profiles for:
--   - reading own profile (settings page)
--   - admin user management
--   - is_active / is_super_admin checks (via SECURITY DEFINER functions)
--
-- The profile_directory view is NOT a table; RLS on profiles still applies.
-- Since the view is defined with SECURITY INVOKER (default), users who can
-- SELECT on the view must also pass the profiles RLS for each row.
-- To allow all authenticated users to read names via the view, we use
-- SECURITY DEFINER on the view:

DROP VIEW IF EXISTS public.profile_directory;

CREATE OR REPLACE VIEW public.profile_directory
WITH (security_invoker = false)  -- SECURITY DEFINER view
AS
  SELECT
    id,
    full_name,
    avatar_url
  FROM public.profiles;

-- Grant only SELECT on the directory view to authenticated
REVOKE ALL ON public.profile_directory FROM PUBLIC;
GRANT SELECT ON public.profile_directory TO authenticated;

-- Revoke direct SELECT on profiles from authenticated (only owner/admin via RLS)
-- NOTE: Supabase grants SELECT to authenticated on all public tables by default.
-- We revoke the table-level grant and rely on RLS + the directory view.
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT ON public.profiles TO authenticated;  -- RLS re-applies (row-filtered)

-- ── 4. Update RLS upgrade migration comment ────────────────────────────────
-- Downstream policies that used to JOIN profiles for display names
-- should be updated to use profile_directory. The SECURITY DEFINER
-- functions (has_capability, get_user_warehouse_ids, etc.) already
-- access profiles directly via SECURITY DEFINER context — no change needed.
