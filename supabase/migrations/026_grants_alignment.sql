-- 026_grants_alignment.sql
-- Least-Privilege Grant Alignment for WACT
--
-- Security Principles:
-- 1. anon: ZERO table access across the entire schema. No public data exposure.
-- 2. authenticated: Granular, least-privilege table grants mapped strictly to application requirements.
--    - Cases & Case Child tables: Mutation is RPC-FIRST (direct INSERT/UPDATE/DELETE revoked).
--    - Master/Lookup tables: SELECT only.
--    - Internal tables (audit_logs, case_sequences): ZERO client access (service_role only).
-- 3. RLS: Row-Level Security remains the primary security boundary for row filtering.
-- 4. Default Privileges: Secure defaults (no automatic grants on future objects).

-- ── 1. Clean Slate: Revoke all broad privileges from PUBLIC and anon ───────
REVOKE ALL ON SCHEMA public FROM PUBLIC, anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM PUBLIC, anon;

-- Secure Default Privileges for future objects (require explicit grants)
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM PUBLIC, anon, authenticated;

-- Allow authenticated and service_role to use schema public
GRANT USAGE ON SCHEMA public TO authenticated, service_role;

-- Ensure service_role has full management privileges
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- ── 2. Targeted Table Grants for authenticated Role ─────────────────────────

-- 2.1 Profiles & Profile Directory
-- profiles: SELECT for self-read / RLS evaluations, UPDATE for self-profile edit
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
-- profile_directory: Safe view exposing only id, full_name, avatar_url
GRANT SELECT ON public.profile_directory TO authenticated;

-- 2.2 Roles & RBAC Registry (Read-only for clients)
GRANT SELECT ON public.roles TO authenticated;
GRANT SELECT ON public.role_capabilities TO authenticated;
GRANT SELECT ON public.user_warehouses TO authenticated;

-- 2.3 Warehouse Structure & Master / Lookup Data (Read-only for clients)
GRANT SELECT ON public.warehouses TO authenticated;
GRANT SELECT ON public.areas TO authenticated;
GRANT SELECT ON public.locations TO authenticated;
GRANT SELECT ON public.asset_categories TO authenticated;
GRANT SELECT ON public.root_causes TO authenticated;
GRANT SELECT ON public.case_categories TO authenticated;
GRANT SELECT ON public.case_subcategories TO authenticated;
GRANT SELECT ON public.inspection_templates TO authenticated;
GRANT SELECT ON public.inspection_template_sections TO authenticated;
GRANT SELECT ON public.inspection_template_items TO authenticated;
GRANT SELECT ON public.sla_configurations TO authenticated;

-- 2.4 Assets (Read via asset.view, Manage via asset.manage under RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assets TO authenticated;

-- 2.5 Inspections & Results
GRANT SELECT, INSERT, UPDATE ON public.inspections TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.inspection_results TO authenticated;
GRANT SELECT, INSERT ON public.inspection_evidences TO authenticated;

-- 2.6 Cases & Child Tables (RPC-FIRST MUTATION MODEL)
-- Clients ONLY read cases and child tables directly; all mutations go through controlled RPCs.
GRANT SELECT ON public.cases TO authenticated;
GRANT SELECT ON public.case_assignments TO authenticated;
GRANT SELECT ON public.case_activities TO authenticated;
GRANT SELECT ON public.case_comments TO authenticated;
GRANT SELECT ON public.case_evidences TO authenticated;
GRANT SELECT ON public.due_date_changes TO authenticated;

-- 2.7 Maintenance Actions (Managed by PIC under RLS)
GRANT SELECT, INSERT, UPDATE ON public.maintenance_actions TO authenticated;

-- 2.8 In-App Notifications & Analytics (Read-only direct access)
GRANT SELECT ON public.notifications TO authenticated;
GRANT SELECT ON public.case_daily_summary TO authenticated;

-- 2.9 Internal Tables (ZERO direct client access)
-- Explicitly revoke any direct client access from audit_logs and case_sequences
REVOKE ALL ON public.audit_logs FROM authenticated;
REVOKE ALL ON public.case_sequences FROM authenticated;

-- ── 3. Function & RPC Privilege Classification ─────────────────────────────

-- 3.1 RLS Helper Functions (Executable by authenticated for RLS policy evaluation)
GRANT EXECUTE ON FUNCTION public.get_user_warehouse_ids() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_capability(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_case_participant(uuid) TO authenticated, service_role;

-- 3.2 Public Business Mutation RPCs (Executable by authenticated clients)
GRANT EXECUTE ON FUNCTION public.create_case(uuid, text, uuid, text, uuid, uuid, uuid, uuid, uuid, uuid, text, boolean, boolean, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assign_case(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_case_progress(uuid, text, text, text, uuid, boolean, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.change_case_priority(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.override_case_due_date(uuid, timestamptz, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_case_verification(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_case(uuid, boolean, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reopen_case(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.force_close_case(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_case_comment(uuid, text, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_case_evidence(uuid, text, text, text, int, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) TO authenticated, service_role;

-- 3.3 Internal Helper Functions (REVOKED from anon, authenticated, PUBLIC)
REVOKE ALL ON FUNCTION public.next_case_sequence(uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_case_activity(uuid, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.send_notification(uuid, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;

-- Internal helpers can only be executed by service_role or internally within SECURITY DEFINER context
GRANT EXECUTE ON FUNCTION public.next_case_sequence(uuid, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_case_activity(uuid, text, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.send_notification(uuid, text, text, text, jsonb) TO service_role;
