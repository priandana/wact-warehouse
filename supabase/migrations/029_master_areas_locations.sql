-- ============================================================================
-- 029_master_areas_locations.sql
-- Master Data: Areas & Locations for PDL (Padalarang) and BDG (Bandung)
-- Idempotent: ON CONFLICT (warehouse_id, code) & (area_id, code)
-- Cross-Warehouse Integrity: Enforces (area_id, warehouse_id) consistency
-- ============================================================================

DO $$
DECLARE
  v_wh_pdl uuid;
  v_wh_bdg uuid;

  -- Area IDs for PDL
  v_pdl_inbound       uuid;
  v_pdl_ambient       uuid;
  v_pdl_chiller       uuid;
  v_pdl_freezer       uuid;
  v_pdl_ptl           uuid;
  v_pdl_outbound      uuid;
  v_pdl_loading       uuid;
  v_pdl_maint         uuid;

  -- Area IDs for BDG
  v_bdg_inbound       uuid;
  v_bdg_ambient       uuid;
  v_bdg_chiller       uuid;
  v_bdg_freezer       uuid;
  v_bdg_ptl           uuid;
  v_bdg_outbound      uuid;
  v_bdg_loading       uuid;
  v_bdg_maint         uuid;
BEGIN
  -- 1. Get warehouse IDs
  SELECT id INTO v_wh_pdl FROM public.warehouses WHERE code = 'PDL';
  SELECT id INTO v_wh_bdg FROM public.warehouses WHERE code = 'BDG';

  IF v_wh_pdl IS NULL OR v_wh_bdg IS NULL THEN
    RAISE EXCEPTION 'Target warehouses (PDL, BDG) not found in public.warehouses';
  END IF;

  -- ==========================================================================
  -- 2. INSERT / UPSERT AREAS FOR PDL & BDG
  -- ==========================================================================

  -- Areas for PDL
  INSERT INTO public.areas (warehouse_id, code, name, description, is_active)
  VALUES
    (v_wh_pdl, 'INBOUND',          'Inbound',                'Area penerimaan barang masuk', true),
    (v_wh_pdl, 'STORAGE_AMBIENT',  'Storage Ambient',        'Area penyimpanan suhu ruang', true),
    (v_wh_pdl, 'STORAGE_CHILLER',  'Storage Chiller',        'Area penyimpanan suhu dingin (2-8 C)', true),
    (v_wh_pdl, 'STORAGE_FREEZER',  'Storage Freezer',        'Area penyimpanan suhu beku (-18 C)', true),
    (v_wh_pdl, 'PICKING_PTL',      'Picking / PTL',          'Area picking dan Put-to-Light', true),
    (v_wh_pdl, 'OUTBOUND',         'Outbound',               'Area pengeluaran dan staging barang', true),
    (v_wh_pdl, 'LOADING',          'Loading',                'Area loading dock truk & armada', true),
    (v_wh_pdl, 'MAINTENANCE',      'Maintenance / Utility',  'Area utilitas, bengkel, dan charging', true)
  ON CONFLICT (warehouse_id, code) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        is_active = EXCLUDED.is_active;

  -- Areas for BDG
  INSERT INTO public.areas (warehouse_id, code, name, description, is_active)
  VALUES
    (v_wh_bdg, 'INBOUND',          'Inbound',                'Area penerimaan barang masuk', true),
    (v_wh_bdg, 'STORAGE_AMBIENT',  'Storage Ambient',        'Area penyimpanan suhu ruang', true),
    (v_wh_bdg, 'STORAGE_CHILLER',  'Storage Chiller',        'Area penyimpanan suhu dingin (2-8 C)', true),
    (v_wh_bdg, 'STORAGE_FREEZER',  'Storage Freezer',        'Area penyimpanan suhu beku (-18 C)', true),
    (v_wh_bdg, 'PICKING_PTL',      'Picking / PTL',          'Area picking dan Put-to-Light', true),
    (v_wh_bdg, 'OUTBOUND',         'Outbound',               'Area pengeluaran dan staging barang', true),
    (v_wh_bdg, 'LOADING',          'Loading',                'Area loading dock truk & armada', true),
    (v_wh_bdg, 'MAINTENANCE',      'Maintenance / Utility',  'Area utilitas, bengkel, dan charging', true)
  ON CONFLICT (warehouse_id, code) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        is_active = EXCLUDED.is_active;

  -- Retrieve PDL Area IDs
  SELECT id INTO v_pdl_inbound FROM public.areas WHERE warehouse_id = v_wh_pdl AND code = 'INBOUND';
  SELECT id INTO v_pdl_ambient FROM public.areas WHERE warehouse_id = v_wh_pdl AND code = 'STORAGE_AMBIENT';
  SELECT id INTO v_pdl_chiller FROM public.areas WHERE warehouse_id = v_wh_pdl AND code = 'STORAGE_CHILLER';
  SELECT id INTO v_pdl_freezer FROM public.areas WHERE warehouse_id = v_wh_pdl AND code = 'STORAGE_FREEZER';
  SELECT id INTO v_pdl_ptl     FROM public.areas WHERE warehouse_id = v_wh_pdl AND code = 'PICKING_PTL';
  SELECT id INTO v_pdl_outbound FROM public.areas WHERE warehouse_id = v_wh_pdl AND code = 'OUTBOUND';
  SELECT id INTO v_pdl_loading FROM public.areas WHERE warehouse_id = v_wh_pdl AND code = 'LOADING';
  SELECT id INTO v_pdl_maint   FROM public.areas WHERE warehouse_id = v_wh_pdl AND code = 'MAINTENANCE';

  -- Retrieve BDG Area IDs
  SELECT id INTO v_bdg_inbound FROM public.areas WHERE warehouse_id = v_wh_bdg AND code = 'INBOUND';
  SELECT id INTO v_bdg_ambient FROM public.areas WHERE warehouse_id = v_wh_bdg AND code = 'STORAGE_AMBIENT';
  SELECT id INTO v_bdg_chiller FROM public.areas WHERE warehouse_id = v_wh_bdg AND code = 'STORAGE_CHILLER';
  SELECT id INTO v_bdg_freezer FROM public.areas WHERE warehouse_id = v_wh_bdg AND code = 'STORAGE_FREEZER';
  SELECT id INTO v_bdg_ptl     FROM public.areas WHERE warehouse_id = v_wh_bdg AND code = 'PICKING_PTL';
  SELECT id INTO v_bdg_outbound FROM public.areas WHERE warehouse_id = v_wh_bdg AND code = 'OUTBOUND';
  SELECT id INTO v_bdg_loading FROM public.areas WHERE warehouse_id = v_wh_bdg AND code = 'LOADING';
  SELECT id INTO v_bdg_maint   FROM public.areas WHERE warehouse_id = v_wh_bdg AND code = 'MAINTENANCE';

  -- ==========================================================================
  -- 3. INSERT / UPSERT LOCATIONS FOR PDL (16 LOCATIONS)
  -- ==========================================================================

  -- PDL: INBOUND
  INSERT INTO public.locations (area_id, warehouse_id, code, name, description, is_active)
  VALUES
    (v_pdl_inbound, v_wh_pdl, 'RECEIVING',       'Receiving',        'Pintu dan meja penerimaan dokumen / fisik', true),
    (v_pdl_inbound, v_wh_pdl, 'STAGING_INBOUND', 'Staging Inbound',  'Area penumpukan sementara barang masuk', true)
  ON CONFLICT (area_id, code) DO UPDATE
    SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

  -- PDL: STORAGE AMBIENT
  INSERT INTO public.locations (area_id, warehouse_id, code, name, description, is_active)
  VALUES
    (v_pdl_ambient, v_wh_pdl, 'AMBIENT_ZONE_A',  'Ambient Zone A',   'Rak dan lorong ambient blok A', true),
    (v_pdl_ambient, v_wh_pdl, 'AMBIENT_ZONE_B',  'Ambient Zone B',   'Rak dan lorong ambient blok B', true)
  ON CONFLICT (area_id, code) DO UPDATE
    SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

  -- PDL: STORAGE CHILLER
  INSERT INTO public.locations (area_id, warehouse_id, code, name, description, is_active)
  VALUES
    (v_pdl_chiller, v_wh_pdl, 'CHILLER_ZONE_A',  'Chiller Zone A',   'Ruang chiller rak blok A', true),
    (v_pdl_chiller, v_wh_pdl, 'CHILLER_ZONE_B',  'Chiller Zone B',   'Ruang chiller rak blok B', true)
  ON CONFLICT (area_id, code) DO UPDATE
    SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

  -- PDL: STORAGE FREEZER
  INSERT INTO public.locations (area_id, warehouse_id, code, name, description, is_active)
  VALUES
    (v_pdl_freezer, v_wh_pdl, 'FREEZER_ZONE_A',  'Freezer Zone A',   'Ruang freezer rak blok A', true),
    (v_pdl_freezer, v_wh_pdl, 'FREEZER_ZONE_B',  'Freezer Zone B',   'Ruang freezer rak blok B', true)
  ON CONFLICT (area_id, code) DO UPDATE
    SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

  -- PDL: PICKING / PTL
  INSERT INTO public.locations (area_id, warehouse_id, code, name, description, is_active)
  VALUES
    (v_pdl_ptl, v_wh_pdl, 'PTL_ZONE_A',          'PTL Zone A',       'Stasiun Put-to-Light line A', true),
    (v_pdl_ptl, v_wh_pdl, 'PTL_ZONE_B',          'PTL Zone B',       'Stasiun Put-to-Light line B', true),
    (v_pdl_ptl, v_wh_pdl, 'PICKING_AREA',        'Picking Area',     'Area lorong pengambilan order reguler', true)
  ON CONFLICT (area_id, code) DO UPDATE
    SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

  -- PDL: OUTBOUND
  INSERT INTO public.locations (area_id, warehouse_id, code, name, description, is_active)
  VALUES
    (v_pdl_outbound, v_wh_pdl, 'STAGING_OUTBOUND', 'Staging Outbound', 'Area penyiapan order siap muat', true)
  ON CONFLICT (area_id, code) DO UPDATE
    SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

  -- PDL: LOADING
  INSERT INTO public.locations (area_id, warehouse_id, code, name, description, is_active)
  VALUES
    (v_pdl_loading, v_wh_pdl, 'LOADING_DOCK_1',  'Loading Dock 1',   'Pintu loading dock 1', true),
    (v_pdl_loading, v_wh_pdl, 'LOADING_DOCK_2',  'Loading Dock 2',   'Pintu loading dock 2', true)
  ON CONFLICT (area_id, code) DO UPDATE
    SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

  -- PDL: MAINTENANCE / UTILITY
  INSERT INTO public.locations (area_id, warehouse_id, code, name, description, is_active)
  VALUES
    (v_pdl_maint, v_wh_pdl, 'MAINTENANCE_AREA',  'Maintenance Area', 'Ruang teknisi dan sparepart', true),
    (v_pdl_maint, v_wh_pdl, 'CHARGING_AREA',     'Charging Area',    'Stasiun pengisian baterai forklift & alat', true)
  ON CONFLICT (area_id, code) DO UPDATE
    SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

  -- ==========================================================================
  -- 4. INSERT / UPSERT LOCATIONS FOR BDG (16 LOCATIONS)
  -- ==========================================================================

  -- BDG: INBOUND
  INSERT INTO public.locations (area_id, warehouse_id, code, name, description, is_active)
  VALUES
    (v_bdg_inbound, v_wh_bdg, 'RECEIVING',       'Receiving',        'Pintu dan meja penerimaan dokumen / fisik', true),
    (v_bdg_inbound, v_wh_bdg, 'STAGING_INBOUND', 'Staging Inbound',  'Area penumpukan sementara barang masuk', true)
  ON CONFLICT (area_id, code) DO UPDATE
    SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

  -- BDG: STORAGE AMBIENT
  INSERT INTO public.locations (area_id, warehouse_id, code, name, description, is_active)
  VALUES
    (v_bdg_ambient, v_wh_bdg, 'AMBIENT_ZONE_A',  'Ambient Zone A',   'Rak dan lorong ambient blok A', true),
    (v_bdg_ambient, v_wh_bdg, 'AMBIENT_ZONE_B',  'Ambient Zone B',   'Rak dan lorong ambient blok B', true)
  ON CONFLICT (area_id, code) DO UPDATE
    SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

  -- BDG: STORAGE CHILLER
  INSERT INTO public.locations (area_id, warehouse_id, code, name, description, is_active)
  VALUES
    (v_bdg_chiller, v_wh_bdg, 'CHILLER_ZONE_A',  'Chiller Zone A',   'Ruang chiller rak blok A', true),
    (v_bdg_chiller, v_wh_bdg, 'CHILLER_ZONE_B',  'Chiller Zone B',   'Ruang chiller rak blok B', true)
  ON CONFLICT (area_id, code) DO UPDATE
    SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

  -- BDG: STORAGE FREEZER
  INSERT INTO public.locations (area_id, warehouse_id, code, name, description, is_active)
  VALUES
    (v_bdg_freezer, v_wh_bdg, 'FREEZER_ZONE_A',  'Freezer Zone A',   'Ruang freezer rak blok A', true),
    (v_bdg_freezer, v_wh_bdg, 'FREEZER_ZONE_B',  'Freezer Zone B',   'Ruang freezer rak blok B', true)
  ON CONFLICT (area_id, code) DO UPDATE
    SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

  -- BDG: PICKING / PTL
  INSERT INTO public.locations (area_id, warehouse_id, code, name, description, is_active)
  VALUES
    (v_bdg_ptl, v_wh_bdg, 'PTL_ZONE_A',          'PTL Zone A',       'Stasiun Put-to-Light line A', true),
    (v_bdg_ptl, v_wh_bdg, 'PTL_ZONE_B',          'PTL Zone B',       'Stasiun Put-to-Light line B', true),
    (v_bdg_ptl, v_wh_bdg, 'PICKING_AREA',        'Picking Area',     'Area lorong pengambilan order reguler', true)
  ON CONFLICT (area_id, code) DO UPDATE
    SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

  -- BDG: OUTBOUND
  INSERT INTO public.locations (area_id, warehouse_id, code, name, description, is_active)
  VALUES
    (v_bdg_outbound, v_wh_bdg, 'STAGING_OUTBOUND', 'Staging Outbound', 'Area penyiapan order siap muat', true)
  ON CONFLICT (area_id, code) DO UPDATE
    SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

  -- BDG: LOADING
  INSERT INTO public.locations (area_id, warehouse_id, code, name, description, is_active)
  VALUES
    (v_bdg_loading, v_wh_bdg, 'LOADING_DOCK_1',  'Loading Dock 1',   'Pintu loading dock 1', true),
    (v_bdg_loading, v_wh_bdg, 'LOADING_DOCK_2',  'Loading Dock 2',   'Pintu loading dock 2', true)
  ON CONFLICT (area_id, code) DO UPDATE
    SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

  -- BDG: MAINTENANCE / UTILITY
  INSERT INTO public.locations (area_id, warehouse_id, code, name, description, is_active)
  VALUES
    (v_bdg_maint, v_wh_bdg, 'MAINTENANCE_AREA',  'Maintenance Area', 'Ruang teknisi dan sparepart', true),
    (v_bdg_maint, v_wh_bdg, 'CHARGING_AREA',     'Charging Area',    'Stasiun pengisian baterai forklift & alat', true)
  ON CONFLICT (area_id, code) DO UPDATE
    SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = EXCLUDED.is_active;

END $$;
