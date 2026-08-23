-- 032_phase2c_inspection_templates_seed.sql
-- Phase 2C: Seed Initial Production Inspection Templates (Hand Pallet, APAR, Rack)
-- Truly idempotent using deterministic UUIDs and fail-fast category validation.
-- Note: inspection_interval_days is explicitly seeded as NULL (no business rule invented).

BEGIN;

DO $$
DECLARE
  v_cat_hand_pallet uuid;
  v_cat_apar        uuid;
  v_cat_rack        uuid;
BEGIN
  -- ── 1. Validate required active categories exist (Fail-Fast) ───────────────
  SELECT id INTO v_cat_hand_pallet FROM public.asset_categories WHERE name = 'Hand Pallet' AND is_active = true LIMIT 1;
  IF v_cat_hand_pallet IS NULL THEN
    RAISE EXCEPTION 'Required active asset category "Hand Pallet" not found';
  END IF;

  SELECT id INTO v_cat_apar FROM public.asset_categories WHERE name = 'APAR' AND is_active = true LIMIT 1;
  IF v_cat_apar IS NULL THEN
    RAISE EXCEPTION 'Required active asset category "APAR" not found';
  END IF;

  SELECT id INTO v_cat_rack FROM public.asset_categories WHERE name = 'Rack' AND is_active = true LIMIT 1;
  IF v_cat_rack IS NULL THEN
    RAISE EXCEPTION 'Required active asset category "Rack" not found';
  END IF;

  -- ── 2. Template 1: Hand Pallet Checklist ─────────────────────────────────
  INSERT INTO public.inspection_templates (
    id, name, category_id, description, inspection_interval_days, is_active
  ) VALUES (
    '00000000-0000-0000-0007-000000000001',
    'Checklist Inspeksi Hand Pallet',
    v_cat_hand_pallet,
    'Pemeriksaan kelayakan operasional, fisik, roda, dan hidrolik hand pallet manual.',
    NULL,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category_id = EXCLUDED.category_id,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

  -- Sections
  INSERT INTO public.inspection_template_sections (id, template_id, title, sort_order) VALUES
    ('00000000-0000-0000-0007-000000000101', '00000000-0000-0000-0007-000000000001', 'Kondisi Fisik & Struktur', 1),
    ('00000000-0000-0000-0007-000000000102', '00000000-0000-0000-0007-000000000001', 'Sistem Hidrolik', 2),
    ('00000000-0000-0000-0007-000000000103', '00000000-0000-0000-0007-000000000001', 'Fungsi Operasional & Safety', 3)
  ON CONFLICT (id) DO UPDATE SET
    template_id = EXCLUDED.template_id,
    title = EXCLUDED.title,
    sort_order = EXCLUDED.sort_order;

  -- Items
  INSERT INTO public.inspection_template_items (id, section_id, label, description, is_required, sort_order) VALUES
    ('00000000-0000-0000-0007-000000001101', '00000000-0000-0000-0007-000000000101', 'Kondisi Garpu / Fork', 'Fork tidak bengkok, retak, atau mengalami deformasi struktur.', true, 1),
    ('00000000-0000-0000-0007-000000001102', '00000000-0000-0000-0007-000000000101', 'Kondisi Roda (Steering & Load Wheels)', 'Roda berputar lancar, tidak pecah, aus parah, atau terlilit tali/plastik.', true, 2),
    ('00000000-0000-0000-0007-000000001103', '00000000-0000-0000-0007-000000000101', 'Handle & Tuas Kendali', 'Handle kokoh, tuas release 3 posisi (Up/Neutral/Down) berfungsi normal.', true, 3),

    ('00000000-0000-0000-0007-000000001201', '00000000-0000-0000-0007-000000000102', 'Pompa & Tekanan Hidrolik', 'Pompa terasa responsif dan mampu mengangkat beban tanpa kendur/anjlok.', true, 1),
    ('00000000-0000-0000-0007-000000001202', '00000000-0000-0000-0007-000000000102', 'Pemeriksaan Kebocoran Oli', 'Tidak ada rembesan atau tetesan oli pada silinder hidrolik dan seal.', true, 2),

    ('00000000-0000-0000-0007-000000001301', '00000000-0000-0000-0007-000000000103', 'Mekanisme Turun (Lowering Valve)', 'Garpu turun secara halus dan terkendali saat tuas release ditarik.', true, 1),
    ('00000000-0000-0000-0007-000000001302', '00000000-0000-0000-0007-000000000103', 'Kelayakan & Kebersihan Unit', 'Unit bersih dari kotoran berlebih dan layak beroperasi di area gudang.', true, 2)
  ON CONFLICT (id) DO UPDATE SET
    section_id = EXCLUDED.section_id,
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    is_required = EXCLUDED.is_required,
    sort_order = EXCLUDED.sort_order;

  -- ── 3. Template 2: APAR Checklist ────────────────────────────────────────
  INSERT INTO public.inspection_templates (
    id, name, category_id, description, inspection_interval_days, is_active
  ) VALUES (
    '00000000-0000-0000-0007-000000000002',
    'Checklist Inspeksi APAR',
    v_cat_apar,
    'Pemeriksaan rutin kesiapan dan kondisi fisik Alat Pemadam Api Ringan (K3/Safety).',
    NULL,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category_id = EXCLUDED.category_id,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

  -- Sections
  INSERT INTO public.inspection_template_sections (id, template_id, title, sort_order) VALUES
    ('00000000-0000-0000-0007-000000000201', '00000000-0000-0000-0007-000000000002', 'Tabung & Label Informasi', 1),
    ('00000000-0000-0000-0007-000000000202', '00000000-0000-0000-0007-000000000002', 'Indikator Tekanan & Pengaman', 2),
    ('00000000-0000-0000-0007-000000000203', '00000000-0000-0000-0007-000000000002', 'Selang, Nozzle & Aksesibilitas', 3)
  ON CONFLICT (id) DO UPDATE SET
    template_id = EXCLUDED.template_id,
    title = EXCLUDED.title,
    sort_order = EXCLUDED.sort_order;

  -- Items
  INSERT INTO public.inspection_template_items (id, section_id, label, description, is_required, sort_order) VALUES
    ('00000000-0000-0000-0007-000000002101', '00000000-0000-0000-0007-000000000201', 'Kondisi Fisik Tabung', 'Tabung tidak berkarat, penyok, bocor, atau mengalami kerusakan cat parah.', true, 1),
    ('00000000-0000-0000-0007-000000002102', '00000000-0000-0000-0007-000000000201', 'Label Instruksi & Masa Berlaku', 'Stiker cara penggunaan terbaca jelas dan kartu masa uji berkala terpasang.', true, 2),

    ('00000000-0000-0000-0007-000000002201', '00000000-0000-0000-0007-000000000202', 'Pressure Gauge (Manometer)', 'Jarum indikator tekanan berada di zona hijau (standar operasional).', true, 1),
    ('00000000-0000-0000-0007-000000002202', '00000000-0000-0000-0007-000000000202', 'Safety Pin & Segel Pengaman', 'Pin pengunci terpasang rapi dan segel plastik/timah dalam keadaan utuh.', true, 2),

    ('00000000-0000-0000-0007-000000002301', '00000000-0000-0000-0007-000000000203', 'Selang (Hose) & Nozzle', 'Selang tidak retak/getas, klem kuat, dan corong nozzle tidak tersumbat.', true, 1),
    ('00000000-0000-0000-0007-000000002302', '00000000-0000-0000-0007-000000000203', 'Akses Bebas Rintangan & Rambu', 'Posisi APAR tidak terhalang barang/pallet dan tanda segitiga APAR terlihat jelas.', true, 2)
  ON CONFLICT (id) DO UPDATE SET
    section_id = EXCLUDED.section_id,
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    is_required = EXCLUDED.is_required,
    sort_order = EXCLUDED.sort_order;

  -- ── 4. Template 3: Pallet Racking Checklist ──────────────────────────────
  INSERT INTO public.inspection_templates (
    id, name, category_id, description, inspection_interval_days, is_active
  ) VALUES (
    '00000000-0000-0000-0007-000000000003',
    'Checklist Inspeksi Pallet Racking',
    v_cat_rack,
    'Audit berkala integritas struktur rak penyimpanan pallet gudang.',
    NULL,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category_id = EXCLUDED.category_id,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

  -- Sections
  INSERT INTO public.inspection_template_sections (id, template_id, title, sort_order) VALUES
    ('00000000-0000-0000-0007-000000000301', '00000000-0000-0000-0007-000000000003', 'Struktur Tiang & Frame', 1),
    ('00000000-0000-0000-0007-000000000302', '00000000-0000-0000-0007-000000000003', 'Balok Penyangga & Pengunci', 2),
    ('00000000-0000-0000-0007-000000000303', '00000000-0000-0000-0007-000000000003', 'Proteksi & Safety Operasional', 3)
  ON CONFLICT (id) DO UPDATE SET
    template_id = EXCLUDED.template_id,
    title = EXCLUDED.title,
    sort_order = EXCLUDED.sort_order;

  -- Items
  INSERT INTO public.inspection_template_items (id, section_id, label, description, is_required, sort_order) VALUES
    ('00000000-0000-0000-0007-000000003101', '00000000-0000-0000-0007-000000000301', 'Tiang Rangka (Upright Post)', 'Tiang tegak lurus, tidak tertekuk, melengkung, atau rusak akibat benturan forklift.', true, 1),
    ('00000000-0000-0000-0007-000000003102', '00000000-0000-0000-0007-000000000301', 'Bracing Horizontal & Diagonal', 'Batang pengaku diagonal/horizontal terpasang kuat, baut tidak longgar/patah.', true, 2),
    ('00000000-0000-0000-0007-000000003103', '00000000-0000-0000-0007-000000000301', 'Baseplate & Anchor Bolt', 'Plat kaki tertanam kokoh di lantai beton dengan dynabolt utuh.', true, 3),

    ('00000000-0000-0000-0007-000000003201', '00000000-0000-0000-0007-000000000302', 'Kondisi Balok Penyangga (Beam)', 'Beam tidak mengalami lendutan berlebih (defleksi) saat menahan beban.', true, 1),
    ('00000000-0000-0000-0007-000000003202', '00000000-0000-0000-0007-000000000302', 'Safety Pin / Locking Pin', 'Semua connector beam memiliki safety pin pengunci agar tidak terangkat forklift.', true, 2),

    ('00000000-0000-0000-0007-000000003301', '00000000-0000-0000-0007-000000000303', 'Pelindung Tiang (Column Guard)', 'Guard protector terpasang pada tiang sudut gang jalan.', true, 1),
    ('00000000-0000-0000-0007-000000003302', '00000000-0000-0000-0007-000000000303', 'Kerapian Pallet & Kapasitas Beban', 'Pallet berada tepat di atas beam dan tidak melebihi kapasitas beban maksimum rak.', true, 2)
  ON CONFLICT (id) DO UPDATE SET
    section_id = EXCLUDED.section_id,
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    is_required = EXCLUDED.is_required,
    sort_order = EXCLUDED.sort_order;

END $$;

COMMIT;
