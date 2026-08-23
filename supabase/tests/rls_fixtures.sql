-- 022_test_fixtures.sql
-- Test users and data fixtures for RLS verification.
-- ⚠️ MUST ONLY BE APPLIED TO NON-PRODUCTION DATABASES.
-- Apply with: supabase db reset (dev) or manually tagged environment.
--
-- This file sets up:
--   Warehouses: WH-PDL (Padalarang), WH-BDG (Bandung)
--   Users: 5 test accounts per role per warehouse
--   Cross-warehouse isolation test data
--
-- Test accounts (created in auth.users):
--   reporter@wh-pdl.test     / Test1234!
--   pic@wh-pdl.test          / Test1234!
--   qc@wh-pdl.test           / Test1234!
--   coordinator@wh-pdl.test  / Test1234!
--   admin@wh-pdl.test        / Test1234!
--   reporter@wh-bdg.test     / Test1234!  (cross-warehouse test)
--
-- NOTE: auth.users inserts require Supabase service role or dashboard.
-- This script configures everything AFTER users are created via the Auth API.
-- Run the CLI commands first, then apply this SQL.

DO $$
DECLARE
  v_wh_pdl_id     uuid := '00000000-0000-0000-0000-000000000001';
  v_wh_bdg_id     uuid := '00000000-0000-0000-0000-000000000002';

  -- These UUIDs are written to auth.users by the seed script / dashboard
  -- Replace with actual UUIDs from `supabase auth list` after creating accounts
  v_reporter_pdl  uuid := '10000000-0000-0000-0000-000000000001';
  v_pic_pdl       uuid := '10000000-0000-0000-0000-000000000002';
  v_qc_pdl        uuid := '10000000-0000-0000-0000-000000000003';
  v_coord_pdl     uuid := '10000000-0000-0000-0000-000000000004';
  v_admin_sys     uuid := '10000000-0000-0000-0000-000000000005';
  v_reporter_bdg  uuid := '10000000-0000-0000-0000-000000000006';

  v_role_reporter      uuid;
  v_role_pic           uuid;
  v_role_qc            uuid;
  v_role_coordinator   uuid;
  v_role_admin         uuid;

  v_area_pdl      uuid;
  v_location_pdl  uuid;
BEGIN

  -- ── Warehouses ──────────────────────────────────────────────────────────
  INSERT INTO public.warehouses (id, code, name, timezone, is_active)
  VALUES
    (v_wh_pdl_id, 'PDL', 'Warehouse Padalarang', 'Asia/Jakarta', true),
    (v_wh_bdg_id, 'BDG', 'Warehouse Bandung',    'Asia/Jakarta', true)
  ON CONFLICT (id) DO NOTHING;

  -- ── Fetch role IDs ──────────────────────────────────────────────────────
  SELECT id INTO v_role_reporter   FROM public.roles WHERE name = 'reporter';
  SELECT id INTO v_role_pic        FROM public.roles WHERE name = 'pic_maintenance';
  SELECT id INTO v_role_qc         FROM public.roles WHERE name = 'qc_leader';
  SELECT id INTO v_role_coordinator FROM public.roles WHERE name = 'coordinator';
  SELECT id INTO v_role_admin      FROM public.roles WHERE name = 'admin';

  -- ── Profiles (manually inserted for test users) ──────────────────────────
  INSERT INTO public.profiles (id, full_name, employee_id, is_active)
  VALUES
    (v_reporter_pdl,  'Reporter PDL',     'EMP-R-PDL', true),
    (v_pic_pdl,       'PIC Maintenance',  'EMP-P-PDL', true),
    (v_qc_pdl,        'QC Leader PDL',    'EMP-Q-PDL', true),
    (v_coord_pdl,     'Coordinator PDL',  'EMP-C-PDL', true),
    (v_admin_sys,     'System Admin',     'EMP-ADMIN', true),
    (v_reporter_bdg,  'Reporter BDG',     'EMP-R-BDG', true)
  ON CONFLICT (id) DO NOTHING;

  -- Mark admin as super_admin
  UPDATE public.profiles SET is_super_admin = true WHERE id = v_admin_sys;

  -- ── User Warehouse Assignments ───────────────────────────────────────────
  -- WH-PDL: reporter
  INSERT INTO public.user_warehouses (user_id, warehouse_id, role_id, is_active)
  VALUES (v_reporter_pdl, v_wh_pdl_id, v_role_reporter, true)
  ON CONFLICT (user_id, warehouse_id, role_id) DO NOTHING;

  -- WH-PDL: PIC
  INSERT INTO public.user_warehouses (user_id, warehouse_id, role_id, is_active)
  VALUES (v_pic_pdl, v_wh_pdl_id, v_role_pic, true)
  ON CONFLICT (user_id, warehouse_id, role_id) DO NOTHING;

  -- WH-PDL: QC
  INSERT INTO public.user_warehouses (user_id, warehouse_id, role_id, is_active)
  VALUES (v_qc_pdl, v_wh_pdl_id, v_role_qc, true)
  ON CONFLICT (user_id, warehouse_id, role_id) DO NOTHING;

  -- WH-PDL: Coordinator
  INSERT INTO public.user_warehouses (user_id, warehouse_id, role_id, is_active)
  VALUES (v_coord_pdl, v_wh_pdl_id, v_role_coordinator, true)
  ON CONFLICT (user_id, warehouse_id, role_id) DO NOTHING;

  -- WH-BDG: reporter_bdg (cross-warehouse isolation test user)
  INSERT INTO public.user_warehouses (user_id, warehouse_id, role_id, is_active)
  VALUES (v_reporter_bdg, v_wh_bdg_id, v_role_reporter, true)
  ON CONFLICT (user_id, warehouse_id, role_id) DO NOTHING;

  -- Admin: no user_warehouses row needed (is_super_admin = true in profiles)

  -- ── Lookup data: area + location in WH-PDL ────────────────────────────
  INSERT INTO public.areas (id, warehouse_id, name)
  VALUES ('20000000-0000-0000-0000-000000000001', v_wh_pdl_id, 'Area A — Loading Bay')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.locations (id, warehouse_id, area_id, name)
  VALUES ('20000000-0000-0000-0000-000000000002', v_wh_pdl_id,
          '20000000-0000-0000-0000-000000000001', 'Loading Dock 1')
  ON CONFLICT (id) DO NOTHING;

  -- ── Seed 2 test cases for cross-warehouse isolation test ────────────────
  -- Case A: reporter_pdl reports case in WH-PDL
  -- Case B: reporter_bdg reports case in WH-BDG
  -- After RLS: reporter_pdl should NOT see Case B, reporter_bdg should NOT see Case A.

  INSERT INTO public.cases (
    id, case_number, title, warehouse_id, reporter_id, priority, status, source
  ) VALUES (
    '30000000-0000-0000-0000-000000000001',
    'WHC-PDL-000000-001',
    '[TEST] PDL case — for isolation test',
    v_wh_pdl_id,
    v_reporter_pdl,
    'medium', 'open', 'direct'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.cases (
    id, case_number, title, warehouse_id, reporter_id, priority, status, source
  ) VALUES (
    '30000000-0000-0000-0000-000000000002',
    'WHC-BDG-000000-001',
    '[TEST] BDG case — for isolation test',
    v_wh_bdg_id,
    v_reporter_bdg,
    'high', 'open', 'direct'
  ) ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Test fixtures inserted successfully.';
  RAISE NOTICE 'Remember to create auth.users with matching UUIDs via Supabase Auth API or dashboard.';
END;
$$;

-- ── RLS VERIFICATION QUERIES ──────────────────────────────────────────────
-- Run these as each test user via supabase.auth.signInWithPassword()
-- then execute the query from the client SDK or SQL editor.

-- 1. As reporter_pdl: should see PDL case, NOT BDG case
--    SELECT id, case_number, warehouse_id FROM cases;
--    Expected: 1 row (PDL case only)

-- 2. As reporter_bdg: should see BDG case, NOT PDL case
--    SELECT id, case_number, warehouse_id FROM cases;
--    Expected: 1 row (BDG case only)

-- 3. As coordinator_pdl: should see ALL PDL cases (case.view_all capability)
--    SELECT id, case_number, warehouse_id FROM cases;
--    Expected: PDL cases only (not BDG)

-- 4. As pic_pdl: should see only assigned cases (case.view_assigned)
--    SELECT id, case_number FROM cases;
--    Expected: 0 rows (no assignments yet)
--    After assigning: 1 row

-- 5. Admin (super_admin): should see all cases from all warehouses
--    SELECT id, case_number, warehouse_id FROM cases;
--    Expected: 2 rows (PDL + BDG)

-- 6. Verifier cannot be the assignee (verify_case):
--    Assign pic_pdl to PDL case, then request_verification as pic_pdl,
--    then attempt verify_case as pic_pdl → should RAISE EXCEPTION

-- 7. Warehouse code immutability:
--    UPDATE warehouses SET code = 'XXX' WHERE code = 'PDL';
--    Expected: RAISE EXCEPTION 'Warehouse code is immutable once cases reference it'
