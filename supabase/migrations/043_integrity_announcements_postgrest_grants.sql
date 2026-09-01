-- 043_integrity_announcements_postgrest_grants.sql
-- PostgREST Schema Cache Table Grants & Fail-Closed RLS Enforcement for Integrity Announcements
-- Follows canonical WACT security posture established in Migration 026 and 041.
--
-- Security Target:
-- 1. PostgREST Introspection: Grant SELECT on integrity_public_announcements to anon and authenticated
--    so PostgREST discovers and indexes the endpoint in its schema cache.
-- 2. No Mutation Privileges: Zero direct INSERT, UPDATE, or DELETE privileges granted to anon or authenticated.
-- 3. Confidentiality via RLS: RLS denies all direct client queries (USING false / WITH CHECK false).
--    Client access and public delivery are mediated exclusively via Server Actions using service_role.
-- 4. Service Role: Retains full management privileges.
-- 5. Cache Reload: Dispatches NOTIFY pgrst, 'reload schema' to immediately refresh the API routing dictionary.

-- ── 1. Service Role Privileges (Full Management) ────────────────────────────

GRANT ALL ON public.integrity_public_announcements TO service_role;

-- ── 2. Minimal Table Grants for PostgREST Schema Discovery ───────────────────

GRANT SELECT ON public.integrity_public_announcements TO anon, authenticated;

-- ── 3. Strict Row Level Security Policies (Fail-Closed) ─────────────────────

ALTER TABLE public.integrity_public_announcements ENABLE ROW LEVEL SECURITY;

-- Deny all direct client SELECT queries from browser/anon PostgREST requests
DROP POLICY IF EXISTS "Deny direct anon access" ON public.integrity_public_announcements;
CREATE POLICY "Deny direct anon access"
ON public.integrity_public_announcements
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Deny all direct client queries from browser/authenticated PostgREST requests
DROP POLICY IF EXISTS "Deny direct authenticated client access" ON public.integrity_public_announcements;
CREATE POLICY "Deny direct authenticated client access"
ON public.integrity_public_announcements
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- ── 4. Reload PostgREST Schema Cache ─────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
