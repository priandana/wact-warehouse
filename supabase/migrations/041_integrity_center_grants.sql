-- 041_integrity_center_grants.sql
-- Least-Privilege Table & Routine Grants for WACT Integrity Center
-- Follows canonical WACT security posture established in Migration 026.
--
-- Security Target:
-- 1. Reset: Explicitly revoke all existing privileges from PUBLIC, anon, and authenticated on all Integrity tables to eliminate additive grant drift.
-- 2. anon: ZERO direct table or routine access across all Integrity objects. Public reporting/tracking is mediated strictly via controlled server actions.
-- 3. authenticated: Granular, least-privilege table grants mapped strictly to application requirements (read/insert only, subject to RLS). Direct table mutations on reports, activities, assignments, and secrets are strictly forbidden.
-- 4. service_role: Full management privileges on all Integrity tables and helper routines to enable server actions and audit operations.

-- ── 1. Clean Slate: Reset All Privileges on Integrity Tables ────────────────

REVOKE ALL ON public.integrity_reports FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.integrity_report_secrets FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.integrity_messages FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.integrity_internal_notes FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.integrity_evidences FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.integrity_activities FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.integrity_assignments FROM PUBLIC, anon, authenticated;

-- ── 2. Service Role Management Grants (Full Control for Server Actions) ───────

GRANT ALL ON public.integrity_reports TO service_role;
GRANT ALL ON public.integrity_report_secrets TO service_role;
GRANT ALL ON public.integrity_messages TO service_role;
GRANT ALL ON public.integrity_internal_notes TO service_role;
GRANT ALL ON public.integrity_evidences TO service_role;
GRANT ALL ON public.integrity_activities TO service_role;
GRANT ALL ON public.integrity_assignments TO service_role;

-- ── 3. Granular Table Grants for Authenticated Role (Constrained by RLS) ──────

-- 3.1 Reports (Read-only for authorized investigators; mutations via Server Action / service_role)
GRANT SELECT ON public.integrity_reports TO authenticated;

-- 3.2 Two-Way Messages (Authorized investigators can read and send messages)
GRANT SELECT, INSERT ON public.integrity_messages TO authenticated;

-- 3.3 Internal Notes (Authorized investigators can read and create confidential notes)
GRANT SELECT, INSERT ON public.integrity_internal_notes TO authenticated;

-- 3.4 Evidence Photos (Authorized investigators can view and upload findings)
GRANT SELECT, INSERT ON public.integrity_evidences TO authenticated;

-- 3.5 Activities Audit Trail (Read-only for authorized investigators; mutations via service_role RPC)
GRANT SELECT ON public.integrity_activities TO authenticated;

-- 3.6 Assignments (Read-only for authorized investigators; assignment via Server Action / service_role)
GRANT SELECT ON public.integrity_assignments TO authenticated;

-- ── 4. Routine Privilege Defense-in-Depth ────────────────────────────────────

REVOKE ALL ON FUNCTION public.log_integrity_activity(
  uuid, text, uuid, text, text, text, jsonb
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.log_integrity_activity(
  uuid, text, uuid, text, text, text, jsonb
) TO service_role;
