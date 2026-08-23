-- 027_phase2b_assets_schema_and_rpcs.sql
-- Phase 2B: Asset & Equipment Management + QR Code Database Schema, Capabilities, and RPCs

-- 1. Update public.assets columns
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS serial_number text,
  ADD COLUMN IF NOT EXISTS condition text NOT NULL DEFAULT 'good',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS qr_code text;

-- Validasi condition constraint
ALTER TABLE public.assets
  DROP CONSTRAINT IF EXISTS assets_condition_check;

ALTER TABLE public.assets
  ADD CONSTRAINT assets_condition_check
  CHECK (condition IN ('good', 'fair', 'damaged', 'critical'));

-- Unique index QR Code per gudang
CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_wh_qr ON public.assets(warehouse_id, qr_code);

-- 2. Seed / Update 12 Standard Asset Categories
INSERT INTO public.asset_categories (id, name, icon, sort_order, is_active)
VALUES
  ('1e9d0f83-b7d6-4f83-9644-18faf9e18f01', 'Hand Pallet', 'truck', 1, true),
  ('1e9d0f83-b7d6-4f83-9644-18faf9e18f02', 'Forklift', 'truck', 2, true),
  ('1e9d0f83-b7d6-4f83-9644-18faf9e18f03', 'Reach Truck', 'truck', 3, true),
  ('1e9d0f83-b7d6-4f83-9644-18faf9e18f04', 'PTL', 'box', 4, true),
  ('1e9d0f83-b7d6-4f83-9644-18faf9e18f05', 'Rack', 'layers', 5, true),
  ('1e9d0f83-b7d6-4f83-9644-18faf9e18f06', 'Scanner', 'scan', 6, true),
  ('1e9d0f83-b7d6-4f83-9644-18faf9e18f07', 'Printer', 'printer', 7, true),
  ('1e9d0f83-b7d6-4f83-9644-18faf9e18f08', 'Scale', 'scale', 8, true),
  ('1e9d0f83-b7d6-4f83-9644-18faf9e18f09', 'APAR', 'flame', 9, true),
  ('1e9d0f83-b7d6-4f83-9644-18faf9e18f10', 'Lamp / Lighting', 'lightbulb', 10, true),
  ('1e9d0f83-b7d6-4f83-9644-18faf9e18f11', 'Chiller / Freezer Equipment', 'snowflake', 11, true),
  ('1e9d0f83-b7d6-4f83-9644-18faf9e18f12', 'Other Equipment', 'wrench', 12, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

-- 3. Capability Mapping for Coordinator & Admin
INSERT INTO public.role_capabilities (role_id, capability)
VALUES
  ('00000000-0000-0000-0000-000000000004', 'asset.manage')
ON CONFLICT DO NOTHING;

-- 4. Controlled RPCs for Assets

-- 4A. create_asset RPC
CREATE OR REPLACE FUNCTION public.create_asset(
  p_warehouse_id uuid,
  p_asset_code text,
  p_name text,
  p_category_id uuid DEFAULT NULL,
  p_area_id uuid DEFAULT NULL,
  p_location_id uuid DEFAULT NULL,
  p_brand text DEFAULT NULL,
  p_model text DEFAULT NULL,
  p_serial_number text DEFAULT NULL,
  p_condition text DEFAULT 'good',
  p_status text DEFAULT 'active',
  p_installed_date date DEFAULT NULL,
  p_photo_url text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_asset_id uuid;
  v_qr_code text;
BEGIN
  -- Capability check
  IF NOT public.has_capability(p_warehouse_id, 'asset.manage') THEN
    RAISE EXCEPTION 'Permission denied: missing asset.manage capability';
  END IF;

  IF trim(p_asset_code) = '' OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Asset code and name are required';
  END IF;

  -- Validate area belongs to warehouse
  IF p_area_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.areas WHERE id = p_area_id AND warehouse_id = p_warehouse_id) THEN
      RAISE EXCEPTION 'Area does not belong to specified warehouse';
    END IF;
  END IF;

  -- Validate location belongs to area
  IF p_location_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.locations WHERE id = p_location_id AND area_id = p_area_id) THEN
      RAISE EXCEPTION 'Location does not belong to specified area';
    END IF;
  END IF;

  v_qr_code := 'WACT-' || upper(trim(p_asset_code));

  INSERT INTO public.assets (
    warehouse_id, asset_code, name, category_id, area_id, location_id,
    brand, model, serial_number, condition, status, installed_date,
    photo_url, notes, qr_code
  ) VALUES (
    p_warehouse_id, upper(trim(p_asset_code)), trim(p_name), p_category_id, p_area_id, p_location_id,
    nullif(trim(p_brand), ''), nullif(trim(p_model), ''), nullif(trim(p_serial_number), ''),
    coalesce(p_condition, 'good'), coalesce(p_status, 'active'), p_installed_date,
    p_photo_url, nullif(trim(p_notes), ''), v_qr_code
  )
  RETURNING id INTO v_asset_id;

  RETURN v_asset_id;
END;
$$;

-- 4B. update_asset RPC
CREATE OR REPLACE FUNCTION public.update_asset(
  p_asset_id uuid,
  p_name text,
  p_category_id uuid DEFAULT NULL,
  p_area_id uuid DEFAULT NULL,
  p_location_id uuid DEFAULT NULL,
  p_brand text DEFAULT NULL,
  p_model text DEFAULT NULL,
  p_serial_number text DEFAULT NULL,
  p_condition text DEFAULT 'good',
  p_status text DEFAULT 'active',
  p_installed_date date DEFAULT NULL,
  p_photo_url text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_warehouse_id uuid;
BEGIN
  SELECT warehouse_id INTO v_warehouse_id
  FROM public.assets
  WHERE id = p_asset_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Asset not found';
  END IF;

  -- Capability check on asset's warehouse
  IF NOT public.has_capability(v_warehouse_id, 'asset.manage') THEN
    RAISE EXCEPTION 'Permission denied: missing asset.manage capability';
  END IF;

  IF trim(p_name) = '' THEN
    RAISE EXCEPTION 'Asset name is required';
  END IF;

  -- Validate area belongs to warehouse
  IF p_area_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.areas WHERE id = p_area_id AND warehouse_id = v_warehouse_id) THEN
      RAISE EXCEPTION 'Area does not belong to specified warehouse';
    END IF;
  END IF;

  -- Validate location belongs to area
  IF p_location_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.locations WHERE id = p_location_id AND area_id = p_area_id) THEN
      RAISE EXCEPTION 'Location does not belong to specified area';
    END IF;
  END IF;

  UPDATE public.assets
  SET
    name = trim(p_name),
    category_id = p_category_id,
    area_id = p_area_id,
    location_id = p_location_id,
    brand = nullif(trim(p_brand), ''),
    model = nullif(trim(p_model), ''),
    serial_number = nullif(trim(p_serial_number), ''),
    condition = coalesce(p_condition, 'good'),
    status = coalesce(p_status, 'active'),
    installed_date = p_installed_date,
    photo_url = coalesce(p_photo_url, photo_url),
    notes = nullif(trim(p_notes), ''),
    updated_at = now()
  WHERE id = p_asset_id;

  RETURN p_asset_id;
END;
$$;

-- 4C. delete_asset RPC (Soft retire or hard delete if no FK references)
CREATE OR REPLACE FUNCTION public.delete_asset(p_asset_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_warehouse_id uuid;
  v_has_cases boolean;
  v_has_inspections boolean;
BEGIN
  SELECT warehouse_id INTO v_warehouse_id
  FROM public.assets
  WHERE id = p_asset_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Asset not found';
  END IF;

  IF NOT public.has_capability(v_warehouse_id, 'asset.manage') THEN
    RAISE EXCEPTION 'Permission denied: missing asset.manage capability';
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.cases WHERE asset_id = p_asset_id) INTO v_has_cases;
  SELECT EXISTS(SELECT 1 FROM public.inspections WHERE asset_id = p_asset_id) INTO v_has_inspections;

  IF v_has_cases OR v_has_inspections THEN
    -- Soft delete / Retire to protect audit trail
    UPDATE public.assets
    SET status = 'retired', updated_at = now()
    WHERE id = p_asset_id;
  ELSE
    DELETE FROM public.assets WHERE id = p_asset_id;
  END IF;

  RETURN true;
END;
$$;

-- 4D. get_asset_by_qr RPC
CREATE OR REPLACE FUNCTION public.get_asset_by_qr(p_qr_code text)
RETURNS SETOF public.assets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT a.*
  FROM public.assets a
  WHERE (a.qr_code = trim(p_qr_code) OR a.asset_code = upper(trim(p_qr_code)))
    AND a.warehouse_id = ANY(public.get_user_warehouse_ids());
END;
$$;
