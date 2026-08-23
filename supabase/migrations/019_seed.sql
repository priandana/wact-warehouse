-- 019_seed.sql
-- Initial seed data: roles, role_capabilities, default SLA, categories, root_causes

-- ── Roles ─────────────────────────────────────────────────────────────────

INSERT INTO public.roles (id, name, display_name, description, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000001', 'reporter',         'Reporter / Operator',   'Can report cases, upload evidence, view own cases', 1),
  ('00000000-0000-0000-0000-000000000002', 'qc_leader',        'QC Leader',              'QC inspections, verification, view all cases', 2),
  ('00000000-0000-0000-0000-000000000003', 'pic_maintenance',  'PIC / Maintenance',      'Assigned tasks, update progress, repair actions', 3),
  ('00000000-0000-0000-0000-000000000004', 'coordinator',      'Coordinator / Officer',  'Assign PICs, verify cases, full dashboard', 4),
  ('00000000-0000-0000-0000-000000000005', 'regional_manager', 'Regional Manager',       'Multi-warehouse visibility and coordination', 5),
  ('00000000-0000-0000-0000-000000000006', 'admin',            'Administrator',          'Full system access and master data management', 6)
ON CONFLICT (name) DO NOTHING;

-- ── Role Capabilities ─────────────────────────────────────────────────────

-- Reporter
INSERT INTO public.role_capabilities (role_id, capability) VALUES
  ('00000000-0000-0000-0000-000000000001', 'case.view_own'),
  ('00000000-0000-0000-0000-000000000001', 'case.create'),
  ('00000000-0000-0000-0000-000000000001', 'evidence.upload'),
  ('00000000-0000-0000-0000-000000000001', 'asset.view')
ON CONFLICT DO NOTHING;

-- QC Leader
INSERT INTO public.role_capabilities (role_id, capability) VALUES
  ('00000000-0000-0000-0000-000000000002', 'case.view_own'),
  ('00000000-0000-0000-0000-000000000002', 'case.view_all'),
  ('00000000-0000-0000-0000-000000000002', 'case.create'),
  ('00000000-0000-0000-0000-000000000002', 'case.verify'),
  ('00000000-0000-0000-0000-000000000002', 'evidence.upload'),
  ('00000000-0000-0000-0000-000000000002', 'asset.view'),
  ('00000000-0000-0000-0000-000000000002', 'inspection.start'),
  ('00000000-0000-0000-0000-000000000002', 'inspection.view'),
  ('00000000-0000-0000-0000-000000000002', 'analytics.view'),
  ('00000000-0000-0000-0000-000000000002', 'report.export')
ON CONFLICT DO NOTHING;

-- PIC / Maintenance
INSERT INTO public.role_capabilities (role_id, capability) VALUES
  ('00000000-0000-0000-0000-000000000003', 'case.view_own'),
  ('00000000-0000-0000-0000-000000000003', 'case.view_assigned'),
  ('00000000-0000-0000-0000-000000000003', 'case.create'),
  ('00000000-0000-0000-0000-000000000003', 'case.update_progress'),
  ('00000000-0000-0000-0000-000000000003', 'case.request_verification'),
  ('00000000-0000-0000-0000-000000000003', 'evidence.upload'),
  ('00000000-0000-0000-0000-000000000003', 'asset.view'),
  ('00000000-0000-0000-0000-000000000003', 'inspection.view')
ON CONFLICT DO NOTHING;

-- Coordinator
INSERT INTO public.role_capabilities (role_id, capability) VALUES
  ('00000000-0000-0000-0000-000000000004', 'case.view_own'),
  ('00000000-0000-0000-0000-000000000004', 'case.view_all'),
  ('00000000-0000-0000-0000-000000000004', 'case.create'),
  ('00000000-0000-0000-0000-000000000004', 'case.assign'),
  ('00000000-0000-0000-0000-000000000004', 'case.update_progress'),
  ('00000000-0000-0000-0000-000000000004', 'case.change_priority'),
  ('00000000-0000-0000-0000-000000000004', 'case.override_due_date'),
  ('00000000-0000-0000-0000-000000000004', 'case.request_verification'),
  ('00000000-0000-0000-0000-000000000004', 'case.verify'),
  ('00000000-0000-0000-0000-000000000004', 'case.reopen'),
  ('00000000-0000-0000-0000-000000000004', 'evidence.upload'),
  ('00000000-0000-0000-0000-000000000004', 'asset.view'),
  ('00000000-0000-0000-0000-000000000004', 'inspection.start'),
  ('00000000-0000-0000-0000-000000000004', 'inspection.view'),
  ('00000000-0000-0000-0000-000000000004', 'analytics.view'),
  ('00000000-0000-0000-0000-000000000004', 'report.export')
ON CONFLICT DO NOTHING;

-- Regional Manager (same operational caps as coordinator)
INSERT INTO public.role_capabilities (role_id, capability) VALUES
  ('00000000-0000-0000-0000-000000000005', 'case.view_own'),
  ('00000000-0000-0000-0000-000000000005', 'case.view_all'),
  ('00000000-0000-0000-0000-000000000005', 'case.create'),
  ('00000000-0000-0000-0000-000000000005', 'case.assign'),
  ('00000000-0000-0000-0000-000000000005', 'case.update_progress'),
  ('00000000-0000-0000-0000-000000000005', 'case.change_priority'),
  ('00000000-0000-0000-0000-000000000005', 'case.override_due_date'),
  ('00000000-0000-0000-0000-000000000005', 'case.request_verification'),
  ('00000000-0000-0000-0000-000000000005', 'case.verify'),
  ('00000000-0000-0000-0000-000000000005', 'case.reopen'),
  ('00000000-0000-0000-0000-000000000005', 'evidence.upload'),
  ('00000000-0000-0000-0000-000000000005', 'asset.view'),
  ('00000000-0000-0000-0000-000000000005', 'inspection.start'),
  ('00000000-0000-0000-0000-000000000005', 'inspection.view'),
  ('00000000-0000-0000-0000-000000000005', 'analytics.view'),
  ('00000000-0000-0000-0000-000000000005', 'report.export')
ON CONFLICT DO NOTHING;

-- Admin (all capabilities)
INSERT INTO public.role_capabilities (role_id, capability) VALUES
  ('00000000-0000-0000-0000-000000000006', 'case.view_own'),
  ('00000000-0000-0000-0000-000000000006', 'case.view_assigned'),
  ('00000000-0000-0000-0000-000000000006', 'case.view_all'),
  ('00000000-0000-0000-0000-000000000006', 'case.create'),
  ('00000000-0000-0000-0000-000000000006', 'case.assign'),
  ('00000000-0000-0000-0000-000000000006', 'case.update_progress'),
  ('00000000-0000-0000-0000-000000000006', 'case.change_priority'),
  ('00000000-0000-0000-0000-000000000006', 'case.override_due_date'),
  ('00000000-0000-0000-0000-000000000006', 'case.request_verification'),
  ('00000000-0000-0000-0000-000000000006', 'case.verify'),
  ('00000000-0000-0000-0000-000000000006', 'case.reopen'),
  ('00000000-0000-0000-0000-000000000006', 'asset.view'),
  ('00000000-0000-0000-0000-000000000006', 'asset.manage'),
  ('00000000-0000-0000-0000-000000000006', 'inspection.start'),
  ('00000000-0000-0000-0000-000000000006', 'inspection.view'),
  ('00000000-0000-0000-0000-000000000006', 'inspection.manage_template'),
  ('00000000-0000-0000-0000-000000000006', 'evidence.upload'),
  ('00000000-0000-0000-0000-000000000006', 'analytics.view'),
  ('00000000-0000-0000-0000-000000000006', 'report.export'),
  ('00000000-0000-0000-0000-000000000006', 'master_data.manage'),
  ('00000000-0000-0000-0000-000000000006', 'sla.manage'),
  ('00000000-0000-0000-0000-000000000006', 'user.manage'),
  ('00000000-0000-0000-0000-000000000006', 'warehouse.manage')
ON CONFLICT DO NOTHING;

-- ── Global SLA Defaults ───────────────────────────────────────────────────
-- warehouse_id = NULL means global fallback

INSERT INTO public.sla_configurations (warehouse_id, priority, duration_hours) VALUES
  (NULL, 'critical', 1),
  (NULL, 'high',     4),
  (NULL, 'medium',   24),
  (NULL, 'low',      72)
ON CONFLICT DO NOTHING;

-- ── Case Categories ───────────────────────────────────────────────────────

INSERT INTO public.case_categories (name, icon, sort_order) VALUES
  ('Inventory',    'package',        1),
  ('Operational',  'settings',       2),
  ('Equipment',    'tool',           3),
  ('Facility',     'building',       4),
  ('Safety / K3',  'shield-alert',   5),
  ('System / IT',  'monitor',        6),
  ('Quality',      'check-circle',   7),
  ('Others',       'more-horizontal',8)
ON CONFLICT DO NOTHING;

-- ── Case Subcategories ────────────────────────────────────────────────────

-- Inventory subcategories
WITH cat AS (SELECT id FROM public.case_categories WHERE name = 'Inventory' LIMIT 1)
INSERT INTO public.case_subcategories (category_id, name, sort_order)
SELECT cat.id, name, ord FROM cat, (VALUES
  ('Stock discrepancy',   1),
  ('Damaged stock',       2),
  ('Wrong location',      3),
  ('Wrong picking',       4),
  ('Expired / near expired', 5)
) AS v(name, ord) ON CONFLICT DO NOTHING;

-- Equipment subcategories
WITH cat AS (SELECT id FROM public.case_categories WHERE name = 'Equipment' LIMIT 1)
INSERT INTO public.case_subcategories (category_id, name, sort_order)
SELECT cat.id, name, ord FROM cat, (VALUES
  ('Hand pallet',  1),
  ('Forklift',     2),
  ('Reach truck',  3),
  ('Scanner',      4),
  ('Printer',      5),
  ('Scale',        6)
) AS v(name, ord) ON CONFLICT DO NOTHING;

-- Facility subcategories
WITH cat AS (SELECT id FROM public.case_categories WHERE name = 'Facility' LIMIT 1)
INSERT INTO public.case_subcategories (category_id, name, sort_order)
SELECT cat.id, name, ord FROM cat, (VALUES
  ('Lamp',       1),
  ('Rack',       2),
  ('Door',       3),
  ('Floor',      4),
  ('Leakage',    5),
  ('Electrical', 6)
) AS v(name, ord) ON CONFLICT DO NOTHING;

-- Safety subcategories
WITH cat AS (SELECT id FROM public.case_categories WHERE name = 'Safety / K3' LIMIT 1)
INSERT INTO public.case_subcategories (category_id, name, sort_order)
SELECT cat.id, name, ord FROM cat, (VALUES
  ('Near miss',                   1),
  ('Unsafe condition',            2),
  ('Fallen pallet',               3),
  ('APAR',                        4),
  ('Emergency path obstruction',  5)
) AS v(name, ord) ON CONFLICT DO NOTHING;

-- System subcategories
WITH cat AS (SELECT id FROM public.case_categories WHERE name = 'System / IT' LIMIT 1)
INSERT INTO public.case_subcategories (category_id, name, sort_order)
SELECT cat.id, name, ord FROM cat, (VALUES
  ('WMS',       1),
  ('Device',    2),
  ('Network',   3),
  ('Printer',   4),
  ('Data sync', 5)
) AS v(name, ord) ON CONFLICT DO NOTHING;

-- ── Root Causes ───────────────────────────────────────────────────────────

INSERT INTO public.root_causes (name, sort_order) VALUES
  ('Human Error',        1),
  ('Process Error',      2),
  ('Equipment Failure',  3),
  ('System Error',       4),
  ('Material Issue',     5),
  ('Vendor Issue',       6),
  ('Other',              7)
ON CONFLICT DO NOTHING;

-- ── Asset Categories ──────────────────────────────────────────────────────

INSERT INTO public.asset_categories (name, icon, sort_order) VALUES
  ('Equipment',  'tool',     1),
  ('Facility',   'building', 2),
  ('Vehicle',    'truck',    3),
  ('IT Device',  'monitor',  4),
  ('Safety',     'shield',   5),
  ('Other',      'box',      6)
ON CONFLICT DO NOTHING;
