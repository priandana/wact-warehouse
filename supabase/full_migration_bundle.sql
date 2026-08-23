-- WACT Complete Production Migration Bundle (001 -> 027)
-- Generated for clean database deployment

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: 001_extensions.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 001_extensions.sql
-- Enable required PostgreSQL extensions

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: 002_profiles.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 002_profiles.sql (FIXED)
-- User profiles extending Supabase auth.users
-- FIX: Removed duplicate/conflicting SELECT policies.
--   - profiles_select_own: was too restrictive (blocked PIC from seeing reporter name)
--   - profiles_select_authenticated: all authenticated users can see all profiles
--     (needed for case list to show reporter names, assignee names, etc.)
--   Only one SELECT policy remains.

CREATE TABLE public.profiles (
  id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name      text NOT NULL,
  employee_id    text UNIQUE,
  phone          text,
  avatar_url     text,
  is_active      boolean NOT NULL DEFAULT true,
  is_super_admin boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Auto-create profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at (used across many tables)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: all authenticated users can read all profiles
-- (needed to display reporter/assignee names in case lists)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users may only update their own profile
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- No direct INSERT (handle_new_user trigger handles it)
-- No direct DELETE (cascade from auth.users)
CREATE POLICY profiles_insert ON public.profiles FOR INSERT WITH CHECK (false);
CREATE POLICY profiles_delete ON public.profiles FOR DELETE USING (false);


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: 003_roles.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 003_roles.sql
-- Roles and DB-level capability registry

CREATE TABLE public.roles (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description  text,
  sort_order   int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- DB-level capability registry — drives has_capability() RLS function
CREATE TABLE public.role_capabilities (
  role_id    uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  capability text NOT NULL,
  PRIMARY KEY (role_id, capability)
);

CREATE INDEX idx_role_cap_lookup ON public.role_capabilities(capability, role_id);

-- RLS: roles and capabilities are readable by all authenticated users
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY roles_select ON public.roles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY roles_insert ON public.roles FOR INSERT WITH CHECK (false); -- managed by admin only via service role
CREATE POLICY roles_update ON public.roles FOR UPDATE USING (false);
CREATE POLICY roles_delete ON public.roles FOR DELETE USING (false);

ALTER TABLE public.role_capabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY role_cap_select ON public.role_capabilities FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY role_cap_insert ON public.role_capabilities FOR INSERT WITH CHECK (false);
CREATE POLICY role_cap_update ON public.role_capabilities FOR UPDATE USING (false);
CREATE POLICY role_cap_delete ON public.role_capabilities FOR DELETE USING (false);


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: 004_warehouses.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 004_warehouses.sql
-- Warehouses with timezone support

CREATE TABLE public.warehouses (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code       text UNIQUE NOT NULL,
  name       text NOT NULL,
  address    text,
  timezone   text NOT NULL DEFAULT 'Asia/Jakarta',
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Support composite FK from child tables (id, code pair needed for case number integrity)
ALTER TABLE public.warehouses ADD CONSTRAINT warehouses_id_code_uq UNIQUE (id, code);

-- user_warehouses: multi-warehouse RBAC junction (created here, references roles from 003)
CREATE TABLE public.user_warehouses (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  role_id      uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  is_active    boolean NOT NULL DEFAULT true,
  assigned_by  uuid REFERENCES public.profiles(id),
  assigned_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, warehouse_id, role_id)
);

CREATE INDEX idx_uw_user_wh ON public.user_warehouses(user_id, warehouse_id, is_active);
CREATE INDEX idx_uw_warehouse ON public.user_warehouses(warehouse_id);

-- RLS
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
-- All authenticated users can read warehouses they have access to (via user_warehouses)
CREATE POLICY warehouses_select ON public.warehouses FOR SELECT
  USING (
    is_active = true AND (
      (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.user_warehouses
        WHERE user_id = auth.uid()
          AND warehouse_id = warehouses.id
          AND is_active = true
      )
    )
  );
CREATE POLICY warehouses_insert ON public.warehouses FOR INSERT WITH CHECK (false);
CREATE POLICY warehouses_update ON public.warehouses FOR UPDATE USING (false);
CREATE POLICY warehouses_delete ON public.warehouses FOR DELETE USING (false);

ALTER TABLE public.user_warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY uw_select ON public.user_warehouses FOR SELECT
  USING (
    user_id = auth.uid()
    OR (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())
  );
CREATE POLICY uw_insert ON public.user_warehouses FOR INSERT WITH CHECK (false);
CREATE POLICY uw_update ON public.user_warehouses FOR UPDATE USING (false);
CREATE POLICY uw_delete ON public.user_warehouses FOR DELETE USING (false);


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: 005_areas_locations.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 005_areas_locations.sql
-- Areas and Locations with composite FK cross-warehouse integrity

CREATE TABLE public.areas (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  code         text NOT NULL,
  name         text NOT NULL,
  description  text,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(warehouse_id, code)
);

-- Needed as composite FK target from locations and assets
ALTER TABLE public.areas ADD CONSTRAINT areas_id_wh_uq UNIQUE (id, warehouse_id);

CREATE INDEX idx_areas_warehouse ON public.areas(warehouse_id);

CREATE TABLE public.locations (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  area_id      uuid NOT NULL REFERENCES public.areas(id) ON DELETE RESTRICT,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  code         text NOT NULL,
  name         text NOT NULL,
  description  text,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(area_id, code)
);

-- Cross-warehouse integrity: location's area must belong to same warehouse
ALTER TABLE public.locations ADD CONSTRAINT locations_area_warehouse_fk
  FOREIGN KEY (area_id, warehouse_id) REFERENCES public.areas(id, warehouse_id);

-- Needed as composite FK target from assets and cases
ALTER TABLE public.locations ADD CONSTRAINT locations_id_wh_uq UNIQUE (id, warehouse_id);

CREATE INDEX idx_locations_area ON public.locations(area_id);
CREATE INDEX idx_locations_warehouse ON public.locations(warehouse_id);

-- RLS: areas
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY areas_select ON public.areas FOR SELECT
  USING (warehouse_id = ANY(
    CASE
      WHEN (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())
      THEN ARRAY(SELECT id FROM public.warehouses WHERE is_active = true)
      ELSE ARRAY(SELECT DISTINCT warehouse_id FROM public.user_warehouses
                 WHERE user_id = auth.uid() AND is_active = true)
    END
  ));
CREATE POLICY areas_insert ON public.areas FOR INSERT WITH CHECK (false);
CREATE POLICY areas_update ON public.areas FOR UPDATE USING (false);
CREATE POLICY areas_delete ON public.areas FOR DELETE USING (false);

-- RLS: locations
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY locations_select ON public.locations FOR SELECT
  USING (warehouse_id = ANY(
    CASE
      WHEN (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())
      THEN ARRAY(SELECT id FROM public.warehouses WHERE is_active = true)
      ELSE ARRAY(SELECT DISTINCT warehouse_id FROM public.user_warehouses
                 WHERE user_id = auth.uid() AND is_active = true)
    END
  ));
CREATE POLICY locations_insert ON public.locations FOR INSERT WITH CHECK (false);
CREATE POLICY locations_update ON public.locations FOR UPDATE USING (false);
CREATE POLICY locations_delete ON public.locations FOR DELETE USING (false);


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: 006_lookup_tables.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 006_lookup_tables.sql
-- All independent lookup/master data tables:
-- asset_categories, root_causes, case_categories, case_subcategories
-- These have no cross-dependencies, so they are created together before
-- assets and cases which reference them.

-- Asset categories
CREATE TABLE public.asset_categories (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       text NOT NULL,
  icon       text,
  is_active  boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY asset_cat_select ON public.asset_categories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY asset_cat_insert ON public.asset_categories FOR INSERT WITH CHECK (false);
CREATE POLICY asset_cat_update ON public.asset_categories FOR UPDATE USING (false);
CREATE POLICY asset_cat_delete ON public.asset_categories FOR DELETE USING (false);

-- Root causes (used when closing cases — created here, referenced by cases in 012)
CREATE TABLE public.root_causes (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        text NOT NULL,
  description text,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.root_causes ENABLE ROW LEVEL SECURITY;
CREATE POLICY root_causes_select ON public.root_causes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY root_causes_insert ON public.root_causes FOR INSERT WITH CHECK (false);
CREATE POLICY root_causes_update ON public.root_causes FOR UPDATE USING (false);
CREATE POLICY root_causes_delete ON public.root_causes FOR DELETE USING (false);

-- Case categories
CREATE TABLE public.case_categories (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       text NOT NULL,
  icon       text,
  color      text,
  is_active  boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.case_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY case_cat_select ON public.case_categories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY case_cat_insert ON public.case_categories FOR INSERT WITH CHECK (false);
CREATE POLICY case_cat_update ON public.case_categories FOR UPDATE USING (false);
CREATE POLICY case_cat_delete ON public.case_categories FOR DELETE USING (false);

-- Case subcategories
-- FK to case_categories — must exist before cases references both
CREATE TABLE public.case_subcategories (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id uuid NOT NULL REFERENCES public.case_categories(id) ON DELETE CASCADE,
  name        text NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Composite unique — needed for cases.cases_subcategory_category_fk in 012
ALTER TABLE public.case_subcategories
  ADD CONSTRAINT subcat_id_cat_uq UNIQUE (id, category_id);

CREATE INDEX idx_subcategories_category ON public.case_subcategories(category_id);

ALTER TABLE public.case_subcategories ENABLE ROW LEVEL SECURITY;
CREATE POLICY case_subcat_select ON public.case_subcategories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY case_subcat_insert ON public.case_subcategories FOR INSERT WITH CHECK (false);
CREATE POLICY case_subcat_update ON public.case_subcategories FOR UPDATE USING (false);
CREATE POLICY case_subcat_delete ON public.case_subcategories FOR DELETE USING (false);


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: 007_inspection_templates.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 007_inspection_templates.sql
-- Inspection templates with sections and items
-- Depends on: asset_categories (006)

CREATE TABLE public.inspection_templates (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        text NOT NULL,
  category_id uuid REFERENCES public.asset_categories(id) ON DELETE SET NULL,
  description text,
  is_active   boolean NOT NULL DEFAULT true,
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER inspection_templates_updated_at
  BEFORE UPDATE ON public.inspection_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.inspection_template_sections (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id uuid NOT NULL REFERENCES public.inspection_templates(id) ON DELETE CASCADE,
  title       text NOT NULL,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tpl_sections_template ON public.inspection_template_sections(template_id);

CREATE TABLE public.inspection_template_items (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id  uuid NOT NULL REFERENCES public.inspection_template_sections(id) ON DELETE CASCADE,
  label       text NOT NULL,
  description text,
  sort_order  int NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tpl_items_section ON public.inspection_template_items(section_id);

-- RLS: templates readable by all authenticated, manageable by admin only
ALTER TABLE public.inspection_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY itpl_select ON public.inspection_templates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY itpl_insert ON public.inspection_templates FOR INSERT WITH CHECK (false);
CREATE POLICY itpl_update ON public.inspection_templates FOR UPDATE USING (false);
CREATE POLICY itpl_delete ON public.inspection_templates FOR DELETE USING (false);

ALTER TABLE public.inspection_template_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY itpl_sec_select ON public.inspection_template_sections FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY itpl_sec_insert ON public.inspection_template_sections FOR INSERT WITH CHECK (false);
CREATE POLICY itpl_sec_update ON public.inspection_template_sections FOR UPDATE USING (false);
CREATE POLICY itpl_sec_delete ON public.inspection_template_sections FOR DELETE USING (false);

ALTER TABLE public.inspection_template_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY itpl_item_select ON public.inspection_template_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY itpl_item_insert ON public.inspection_template_items FOR INSERT WITH CHECK (false);
CREATE POLICY itpl_item_update ON public.inspection_template_items FOR UPDATE USING (false);
CREATE POLICY itpl_item_delete ON public.inspection_template_items FOR DELETE USING (false);


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: 008_sla_configurations.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 008_sla_configurations.sql
-- SLA configurations — configurable per warehouse × priority
-- Depends on: warehouses (004), profiles (002)

CREATE TABLE public.sla_configurations (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id   uuid REFERENCES public.warehouses(id) ON DELETE CASCADE,
  -- NULL = global fallback (applies to all warehouses without specific config)
  priority       text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  duration_hours numeric NOT NULL CHECK (duration_hours > 0),
  is_active      boolean NOT NULL DEFAULT true,
  created_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER sla_configurations_updated_at
  BEFORE UPDATE ON public.sla_configurations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Partial unique indexes — handles PostgreSQL NULL behavior correctly
-- Multiple NULLs are allowed by standard UNIQUE, so we need partial indexes:
CREATE UNIQUE INDEX uq_sla_global_priority
  ON public.sla_configurations(priority)
  WHERE warehouse_id IS NULL;

CREATE UNIQUE INDEX uq_sla_warehouse_priority
  ON public.sla_configurations(warehouse_id, priority)
  WHERE warehouse_id IS NOT NULL;

-- RLS: readable by authenticated, manageable by service role only
ALTER TABLE public.sla_configurations ENABLE ROW LEVEL SECURITY;
CREATE POLICY sla_select ON public.sla_configurations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY sla_insert ON public.sla_configurations FOR INSERT WITH CHECK (false);
CREATE POLICY sla_update ON public.sla_configurations FOR UPDATE USING (false);
CREATE POLICY sla_delete ON public.sla_configurations FOR DELETE USING (false);


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: 009_assets.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 009_assets.sql
-- Assets with composite FK cross-warehouse integrity
-- Depends on: asset_categories (006), warehouses (004),
--             areas (005), locations (005), inspection_templates (007)

CREATE TABLE public.assets (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_code          text NOT NULL,
  name                text NOT NULL,
  category_id         uuid REFERENCES public.asset_categories(id) ON DELETE SET NULL,
  warehouse_id        uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  area_id             uuid,           -- FK + composite FK added below
  location_id         uuid,           -- FK + composite FK added below
  photo_url           text,
  status              text NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'inactive', 'maintenance', 'retired')),
  specification       jsonb,
  installed_date      date,
  qr_code_url         text,
  template_id         uuid REFERENCES public.inspection_templates(id) ON DELETE SET NULL,
  last_inspection_at  timestamptz,
  next_inspection_at  timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  -- asset_code is unique per warehouse, NOT globally
  UNIQUE(warehouse_id, asset_code)
);

CREATE TRIGGER assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Standard FK references (non-composite)
ALTER TABLE public.assets
  ADD CONSTRAINT assets_area_fk FOREIGN KEY (area_id) REFERENCES public.areas(id) ON DELETE SET NULL;
ALTER TABLE public.assets
  ADD CONSTRAINT assets_location_fk FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL;

-- Composite FKs: cross-warehouse integrity
-- area must belong to same warehouse as asset
ALTER TABLE public.assets
  ADD CONSTRAINT assets_area_warehouse_fk
  FOREIGN KEY (area_id, warehouse_id) REFERENCES public.areas(id, warehouse_id)
  DEFERRABLE INITIALLY DEFERRED;

-- location must belong to same warehouse as asset
ALTER TABLE public.assets
  ADD CONSTRAINT assets_location_warehouse_fk
  FOREIGN KEY (location_id, warehouse_id) REFERENCES public.locations(id, warehouse_id)
  DEFERRABLE INITIALLY DEFERRED;

-- Needed as composite FK target from inspections and cases
ALTER TABLE public.assets ADD CONSTRAINT assets_id_wh_uq UNIQUE (id, warehouse_id);

-- Indexes
CREATE INDEX idx_assets_warehouse ON public.assets(warehouse_id);
CREATE INDEX idx_assets_area ON public.assets(area_id);
CREATE INDEX idx_assets_status ON public.assets(status);
CREATE UNIQUE INDEX idx_assets_wh_code ON public.assets(warehouse_id, asset_code);

-- RLS (uses inline warehouse check — has_capability defined later in 017)
-- Temporary simple RLS for Phase 1; will be replaced by full policy in 018
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY assets_select ON public.assets FOR SELECT
  USING (
    warehouse_id = ANY(
      CASE
        WHEN (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())
        THEN ARRAY(SELECT id FROM public.warehouses WHERE is_active = true)
        ELSE ARRAY(SELECT DISTINCT warehouse_id FROM public.user_warehouses
                   WHERE user_id = auth.uid() AND is_active = true)
      END
    )
  );

CREATE POLICY assets_insert ON public.assets FOR INSERT WITH CHECK (false);
CREATE POLICY assets_update ON public.assets FOR UPDATE USING (false);
CREATE POLICY assets_delete ON public.assets FOR DELETE USING (false);


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: 010_inspections.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 010_inspections.sql
-- Inspections, results, and normalized evidence table
-- Depends on: assets (009), warehouses (004),
--             inspection_templates (007), profiles (002)
-- Note: inspections uses composite FK to assets(id, warehouse_id)
--       so asset and inspection must be in same warehouse.

CREATE TABLE public.inspections (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_number text UNIQUE NOT NULL,
  asset_id          uuid NOT NULL,
  warehouse_id      uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  template_id       uuid REFERENCES public.inspection_templates(id) ON DELETE SET NULL,
  inspector_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status            text NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'completed', 'cancelled')),
  overall_result    text CHECK (overall_result IN ('ok', 'ng', 'na')),
  notes             text,
  started_at        timestamptz,
  completed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Standard FK to assets
ALTER TABLE public.inspections
  ADD CONSTRAINT inspections_asset_fk FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE RESTRICT;

-- Composite FK: asset must belong to same warehouse as inspection
ALTER TABLE public.inspections
  ADD CONSTRAINT inspections_asset_warehouse_fk
  FOREIGN KEY (asset_id, warehouse_id) REFERENCES public.assets(id, warehouse_id);

-- Needed as composite FK target from cases.inspection_id (012)
ALTER TABLE public.inspections ADD CONSTRAINT inspections_id_wh_uq UNIQUE (id, warehouse_id);

CREATE INDEX idx_inspections_asset ON public.inspections(asset_id);
CREATE INDEX idx_inspections_warehouse ON public.inspections(warehouse_id);
CREATE INDEX idx_inspections_inspector ON public.inspections(inspector_id);
CREATE INDEX idx_inspections_created ON public.inspections(created_at DESC);

CREATE TABLE public.inspection_results (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_id uuid NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  item_id       uuid NOT NULL REFERENCES public.inspection_template_items(id) ON DELETE RESTRICT,
  value         text CHECK (value IN ('ok', 'ng', 'na')),
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_results_inspection ON public.inspection_results(inspection_id);
CREATE INDEX idx_results_item ON public.inspection_results(item_id);

-- Normalized evidence table (replaces photo_urls text[])
CREATE TABLE public.inspection_evidences (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_id        uuid NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  inspection_result_id uuid REFERENCES public.inspection_results(id) ON DELETE SET NULL,
  -- nullable: NULL = inspection-level evidence, not-null = item-level evidence
  uploader_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  file_url             text NOT NULL,
  file_name            text,
  file_size            int CHECK (file_size > 0),
  mime_type            text,
  caption              text,
  uploaded_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_insp_evidence_inspection ON public.inspection_evidences(inspection_id);
CREATE INDEX idx_insp_evidence_result ON public.inspection_evidences(inspection_result_id);

-- RLS for inspections (warehouse-scoped)
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY inspections_select ON public.inspections FOR SELECT
  USING (
    warehouse_id = ANY(
      CASE
        WHEN (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())
        THEN ARRAY(SELECT id FROM public.warehouses WHERE is_active = true)
        ELSE ARRAY(SELECT DISTINCT warehouse_id FROM public.user_warehouses
                   WHERE user_id = auth.uid() AND is_active = true)
      END
    )
  );
CREATE POLICY inspections_insert ON public.inspections FOR INSERT WITH CHECK (false);
CREATE POLICY inspections_update ON public.inspections FOR UPDATE USING (false);
CREATE POLICY inspections_delete ON public.inspections FOR DELETE USING (false);

ALTER TABLE public.inspection_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY insp_results_select ON public.inspection_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = inspection_results.inspection_id
        AND i.warehouse_id = ANY(
          CASE
            WHEN (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())
            THEN ARRAY(SELECT id FROM public.warehouses WHERE is_active = true)
            ELSE ARRAY(SELECT DISTINCT warehouse_id FROM public.user_warehouses
                       WHERE user_id = auth.uid() AND is_active = true)
          END
        )
    )
  );
CREATE POLICY insp_results_insert ON public.inspection_results FOR INSERT WITH CHECK (false);
CREATE POLICY insp_results_update ON public.inspection_results FOR UPDATE USING (false);
CREATE POLICY insp_results_delete ON public.inspection_results FOR DELETE USING (false);

ALTER TABLE public.inspection_evidences ENABLE ROW LEVEL SECURITY;
CREATE POLICY insp_ev_select ON public.inspection_evidences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = inspection_evidences.inspection_id
        AND i.warehouse_id = ANY(
          CASE
            WHEN (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())
            THEN ARRAY(SELECT id FROM public.warehouses WHERE is_active = true)
            ELSE ARRAY(SELECT DISTINCT warehouse_id FROM public.user_warehouses
                       WHERE user_id = auth.uid() AND is_active = true)
          END
        )
    )
  );
CREATE POLICY insp_ev_insert ON public.inspection_evidences FOR INSERT WITH CHECK (false);
CREATE POLICY insp_ev_update ON public.inspection_evidences FOR UPDATE USING (false);
CREATE POLICY insp_ev_delete ON public.inspection_evidences FOR DELETE USING (false);


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: 011_case_sequences.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 011_case_sequences.sql
-- Atomic case number sequence table
-- Depends on: warehouses (004)
-- Uses date type (not text) — formatted to yyMMdd only in TypeScript

CREATE TABLE public.case_sequences (
  warehouse_id  uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  sequence_date date NOT NULL,
  -- DB stores: 2026-08-22 (full date in warehouse local timezone, converted server-side)
  -- Case number displays: yyMMdd = '260822' (formatted in TypeScript, not stored here)
  last_sequence int NOT NULL DEFAULT 0,
  PRIMARY KEY (warehouse_id, sequence_date)
);

-- Atomic sequence function
-- Security: validates caller has case.create capability in the warehouse.
-- Must be called server-side only (within createCase server action).
-- search_path hardened to prevent schema injection.
CREATE OR REPLACE FUNCTION public.next_case_sequence(
  p_warehouse_id uuid,
  p_date         date
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq int;
BEGIN
  -- Security: caller must have case.create capability in this warehouse
  -- has_capability is defined in 017_rls_functions.sql; since migrations run in order,
  -- during Phase 1 testing this check will be enforced after 017 is applied.
  -- For clean migration chain, we inline the check here:
  IF NOT (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.user_warehouses uw
      JOIN public.role_capabilities rc ON rc.role_id = uw.role_id
      WHERE uw.user_id      = auth.uid()
        AND uw.warehouse_id = p_warehouse_id
        AND uw.is_active    = true
        AND rc.capability   = 'case.create'
    )
  ) THEN
    RAISE EXCEPTION 'Permission denied: cannot create cases in warehouse %', p_warehouse_id;
  END IF;

  INSERT INTO public.case_sequences (warehouse_id, sequence_date, last_sequence)
  VALUES (p_warehouse_id, p_date, 1)
  ON CONFLICT (warehouse_id, sequence_date)
  DO UPDATE SET last_sequence = public.case_sequences.last_sequence + 1
  RETURNING last_sequence INTO v_seq;

  RETURN v_seq;
END;
$$;

-- Restrict EXECUTE to authenticated users only (not anon)
REVOKE ALL ON FUNCTION public.next_case_sequence(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_case_sequence(uuid, date) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: 012_cases.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 012_cases.sql
-- Cases — the core entity
-- Depends on: case_categories/subcategories (006), warehouses (004),
--             areas (005), locations (005), assets (009),
--             profiles (002), inspections (010), root_causes (006)
-- ALL cross-warehouse composite FKs applied here.

CREATE TABLE public.cases (
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_number             text UNIQUE NOT NULL,
  -- Format: WHC-{WAREHOUSE_CODE}-{yyMMdd}-{SEQ}   e.g. WHC-PDL-260822-001
  title                   text NOT NULL,
  description             text,
  category_id             uuid REFERENCES public.case_categories(id) ON DELETE RESTRICT,
  subcategory_id          uuid,
  -- FK + composite FK for subcategory→category integrity (added below)
  warehouse_id            uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  area_id                 uuid,
  location_id             uuid,
  asset_id                uuid,
  inspection_id           uuid,
  reporter_id             uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  priority                text NOT NULL DEFAULT 'medium'
                            CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status                  text NOT NULL DEFAULT 'open'
                            CHECK (status IN (
                              'open', 'on_progress', 'waiting_repair',
                              'waiting_verification', 'closed', 'reopened'
                            )),
  has_operational_impact  boolean NOT NULL DEFAULT false,
  requires_maintenance    boolean NOT NULL DEFAULT false,
  source                  text NOT NULL DEFAULT 'direct'
                            CHECK (source IN ('direct', 'inspection')),
  root_cause_id           uuid REFERENCES public.root_causes(id) ON DELETE SET NULL,
  corrective_action       text,
  preventive_action       text,
  due_date                timestamptz,
  closed_at               timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER cases_updated_at
  BEFORE UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Standard FK references
ALTER TABLE public.cases
  ADD CONSTRAINT cases_subcategory_fk FOREIGN KEY (subcategory_id)
  REFERENCES public.case_subcategories(id) ON DELETE SET NULL;

ALTER TABLE public.cases
  ADD CONSTRAINT cases_area_fk FOREIGN KEY (area_id)
  REFERENCES public.areas(id) ON DELETE SET NULL;

ALTER TABLE public.cases
  ADD CONSTRAINT cases_location_fk FOREIGN KEY (location_id)
  REFERENCES public.locations(id) ON DELETE SET NULL;

ALTER TABLE public.cases
  ADD CONSTRAINT cases_asset_fk FOREIGN KEY (asset_id)
  REFERENCES public.assets(id) ON DELETE SET NULL;

ALTER TABLE public.cases
  ADD CONSTRAINT cases_inspection_fk FOREIGN KEY (inspection_id)
  REFERENCES public.inspections(id) ON DELETE SET NULL;

-- ── Composite FKs: cross-warehouse integrity ──────────────────────────────

-- Subcategory must belong to selected category
ALTER TABLE public.cases
  ADD CONSTRAINT cases_subcategory_category_fk
  FOREIGN KEY (subcategory_id, category_id)
  REFERENCES public.case_subcategories(id, category_id)
  DEFERRABLE INITIALLY DEFERRED;

-- Area must belong to same warehouse as case
ALTER TABLE public.cases
  ADD CONSTRAINT cases_area_warehouse_fk
  FOREIGN KEY (area_id, warehouse_id) REFERENCES public.areas(id, warehouse_id)
  DEFERRABLE INITIALLY DEFERRED;

-- Location must belong to same warehouse as case
ALTER TABLE public.cases
  ADD CONSTRAINT cases_location_warehouse_fk
  FOREIGN KEY (location_id, warehouse_id) REFERENCES public.locations(id, warehouse_id)
  DEFERRABLE INITIALLY DEFERRED;

-- Asset must belong to same warehouse as case
ALTER TABLE public.cases
  ADD CONSTRAINT cases_asset_warehouse_fk
  FOREIGN KEY (asset_id, warehouse_id) REFERENCES public.assets(id, warehouse_id)
  DEFERRABLE INITIALLY DEFERRED;

-- Inspection must belong to same warehouse as case
ALTER TABLE public.cases
  ADD CONSTRAINT cases_inspection_warehouse_fk
  FOREIGN KEY (inspection_id, warehouse_id) REFERENCES public.inspections(id, warehouse_id)
  DEFERRABLE INITIALLY DEFERRED;

-- ─────────────────────────────────────────────────────────────────────────

-- Indexes
CREATE INDEX idx_cases_warehouse  ON public.cases(warehouse_id);
CREATE INDEX idx_cases_asset      ON public.cases(asset_id);
CREATE INDEX idx_cases_category   ON public.cases(category_id);
CREATE INDEX idx_cases_status     ON public.cases(status);
CREATE INDEX idx_cases_priority   ON public.cases(priority);
CREATE INDEX idx_cases_reporter   ON public.cases(reporter_id);
CREATE INDEX idx_cases_created    ON public.cases(created_at DESC);
CREATE INDEX idx_cases_due        ON public.cases(due_date) WHERE status NOT IN ('closed');
CREATE INDEX idx_cases_active     ON public.cases(warehouse_id, status, priority)
  WHERE status NOT IN ('closed');

-- Full-text search on title
CREATE INDEX idx_cases_title_trgm ON public.cases USING gin(title gin_trgm_ops);

-- RLS
-- IMPORTANT: Temporary policy — CANNOT reference case_assignments here
-- because that table is created in migration 013 (after this one).
-- The full capability-based policy (including assignee check) is installed in 017.
-- Temporary policy: warehouse-scoped + reporter only.
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY cases_select ON public.cases FOR SELECT
  USING (
    warehouse_id = ANY(
      CASE
        WHEN (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())
        THEN ARRAY(SELECT id FROM public.warehouses WHERE is_active = true)
        ELSE ARRAY(SELECT DISTINCT warehouse_id FROM public.user_warehouses
                   WHERE user_id = auth.uid() AND is_active = true)
      END
    )
    AND reporter_id = auth.uid()
    -- NOTE: assignee-based access added in 017_rls_policies_upgrade.sql
    -- after case_assignments table exists.
  );

CREATE POLICY cases_insert ON public.cases FOR INSERT WITH CHECK (false);
-- All inserts go through create_case() RPC

CREATE POLICY cases_update ON public.cases FOR UPDATE USING (false);
-- All updates go through dedicated controlled mutation RPCs

CREATE POLICY cases_delete ON public.cases FOR DELETE USING (false);



-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: 013_case_child_tables.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 013_case_child_tables.sql
-- All case child tables: assignments, activities, comments, evidences, due_date_changes
-- Depends on: cases (012), profiles (002)

-- ── Case Assignments ──────────────────────────────────────────────────────

CREATE TABLE public.case_assignments (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id       uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  assignee_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  assigned_by   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  assigned_at   timestamptz NOT NULL DEFAULT now(),
  unassigned_at timestamptz,
  is_current    boolean NOT NULL DEFAULT true
);

-- At most ONE current assignment per case (partial unique index)
CREATE UNIQUE INDEX uq_case_current_assignment
  ON public.case_assignments(case_id)
  WHERE is_current = true;

CREATE INDEX idx_assignments_case     ON public.case_assignments(case_id);
CREATE INDEX idx_assignments_assignee ON public.case_assignments(assignee_id) WHERE is_current = true;

ALTER TABLE public.case_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY case_assign_select ON public.case_assignments FOR SELECT
  USING (
    assignee_id = auth.uid()
    OR assigned_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_assignments.case_id AND c.reporter_id = auth.uid()
    )
  );
CREATE POLICY case_assign_insert ON public.case_assignments FOR INSERT WITH CHECK (false);
CREATE POLICY case_assign_update ON public.case_assignments FOR UPDATE USING (false);
CREATE POLICY case_assign_delete ON public.case_assignments FOR DELETE USING (false);

-- ── Case Activities (append-only, immutable) ──────────────────────────────

CREATE TABLE public.case_activities (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id     uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  actor_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action      text NOT NULL,
  -- Values: 'created' | 'assigned' | 'status_changed' | 'commented'
  -- | 'due_date_overridden' | 'evidence_added' | 'verified'
  -- | 'closed' | 'reopened' | 'maintenance_updated' | 'verification_failed'
  from_status text,
  to_status   text,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activities_case ON public.case_activities(case_id, created_at DESC);

ALTER TABLE public.case_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY activities_select ON public.case_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_activities.case_id
        AND (
          c.reporter_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.case_assignments ca
            WHERE ca.case_id = c.id AND ca.assignee_id = auth.uid()
          )
          OR (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())
        )
    )
  );
-- No INSERT/UPDATE/DELETE from client — all via SECURITY DEFINER RPCs
CREATE POLICY activities_insert ON public.case_activities FOR INSERT WITH CHECK (false);
CREATE POLICY activities_update ON public.case_activities FOR UPDATE USING (false);
CREATE POLICY activities_delete ON public.case_activities FOR DELETE USING (false);

-- ── Case Comments ─────────────────────────────────────────────────────────

CREATE TABLE public.case_comments (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id     uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  content     text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER case_comments_updated_at
  BEFORE UPDATE ON public.case_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_comments_case ON public.case_comments(case_id, created_at);

ALTER TABLE public.case_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY comments_select ON public.case_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_comments.case_id
        AND (
          c.reporter_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.case_assignments ca
            WHERE ca.case_id = c.id AND ca.assignee_id = auth.uid()
          )
          OR (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())
        )
    )
  );
CREATE POLICY comments_insert ON public.case_comments FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_comments.case_id
        AND (
          c.reporter_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.case_assignments ca
            WHERE ca.case_id = c.id AND ca.assignee_id = auth.uid()
          )
          OR (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())
        )
    )
  );
CREATE POLICY comments_update ON public.case_comments FOR UPDATE
  USING (author_id = auth.uid());
CREATE POLICY comments_delete ON public.case_comments FOR DELETE USING (false);

-- ── Case Evidences ────────────────────────────────────────────────────────

CREATE TABLE public.case_evidences (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id     uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  uploader_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  phase       text NOT NULL CHECK (phase IN ('before', 'during', 'after')),
  file_url    text NOT NULL,
  file_name   text,
  file_size   int CHECK (file_size > 0),
  mime_type   text,
  caption     text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_evidences_case ON public.case_evidences(case_id);

ALTER TABLE public.case_evidences ENABLE ROW LEVEL SECURITY;
CREATE POLICY evidences_select ON public.case_evidences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_evidences.case_id
        AND (
          c.reporter_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.case_assignments ca
            WHERE ca.case_id = c.id AND ca.assignee_id = auth.uid()
          )
          OR (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())
        )
    )
  );
CREATE POLICY evidences_insert ON public.case_evidences FOR INSERT WITH CHECK (false);
CREATE POLICY evidences_update ON public.case_evidences FOR UPDATE USING (false);
CREATE POLICY evidences_delete ON public.case_evidences FOR DELETE USING (false);

-- ── Due Date Changes (audit trail) ────────────────────────────────────────

CREATE TABLE public.due_date_changes (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id           uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  changed_by        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  previous_due_date timestamptz NOT NULL,
  new_due_date      timestamptz NOT NULL,
  reason            text NOT NULL,   -- enforced NOT NULL at DB level; also validated by Zod
  changed_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_due_changes_case ON public.due_date_changes(case_id);

ALTER TABLE public.due_date_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY due_changes_select ON public.due_date_changes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = due_date_changes.case_id
        AND (
          c.reporter_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.case_assignments ca
            WHERE ca.case_id = c.id AND ca.assignee_id = auth.uid()
          )
          OR (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())
        )
    )
  );
CREATE POLICY due_changes_insert ON public.due_date_changes FOR INSERT WITH CHECK (false);
CREATE POLICY due_changes_update ON public.due_date_changes FOR UPDATE USING (false);
CREATE POLICY due_changes_delete ON public.due_date_changes FOR DELETE USING (false);


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: 014_maintenance.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 014_maintenance.sql
-- Maintenance actions
-- Depends on: cases (012), warehouses (004), profiles (002)
-- Cross-warehouse integrity enforced via trigger in 019

CREATE TABLE public.maintenance_actions (
  id                          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id                     uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  warehouse_id                uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  pic_id                      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_description          text NOT NULL,
  action_taken                text,
  parts_used                  text,
  started_at                  timestamptz,
  completed_at                timestamptz,
  verification_requested_at   timestamptz,
  verified_by                 uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at                 timestamptz,
  status                      text NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'in_progress', 'done', 'rejected')),
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),

  -- PIC cannot verify their own repair
  CONSTRAINT chk_verifier_not_pic CHECK (verified_by IS NULL OR verified_by <> pic_id)
);

CREATE TRIGGER maintenance_updated_at
  BEFORE UPDATE ON public.maintenance_actions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_maintenance_case      ON public.maintenance_actions(case_id);
CREATE INDEX idx_maintenance_warehouse ON public.maintenance_actions(warehouse_id);
CREATE INDEX idx_maintenance_pic       ON public.maintenance_actions(pic_id);

-- RLS
ALTER TABLE public.maintenance_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY maint_select ON public.maintenance_actions FOR SELECT
  USING (
    warehouse_id = ANY(
      CASE
        WHEN (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())
        THEN ARRAY(SELECT id FROM public.warehouses WHERE is_active = true)
        ELSE ARRAY(SELECT DISTINCT warehouse_id FROM public.user_warehouses
                   WHERE user_id = auth.uid() AND is_active = true)
      END
    )
    AND (
      pic_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.cases c
        WHERE c.id = maintenance_actions.case_id
          AND c.reporter_id = auth.uid()
      )
      OR (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())
    )
  );
CREATE POLICY maint_insert ON public.maintenance_actions FOR INSERT WITH CHECK (false);
CREATE POLICY maint_update ON public.maintenance_actions FOR UPDATE USING (false);
CREATE POLICY maint_delete ON public.maintenance_actions FOR DELETE USING (false);


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: 015_notifications_audit_analytics.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 015_notifications_audit_analytics.sql
-- Notifications, audit_logs, case_daily_summary
-- Depends on: profiles (002), warehouses (004), case_categories (006)

-- ── Notifications ─────────────────────────────────────────────────────────

CREATE TABLE public.notifications (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type         text NOT NULL,
  -- 'case_assigned' | 'case_overdue' | 'status_changed'
  -- | 'waiting_verification' | 'reopened' | 'maintenance_completed'
  -- | 'due_date_overridden' | 'verification_failed'
  title        text NOT NULL,
  body         text,
  data         jsonb,
  is_read      boolean NOT NULL DEFAULT false,
  read_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_recipient
  ON public.notifications(recipient_id, is_read, created_at DESC);

-- Supabase Realtime should be enabled on this table for live bell updates

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
-- Recipients can only see their own notifications
CREATE POLICY notif_select ON public.notifications FOR SELECT
  USING (recipient_id = auth.uid());
-- Mark as read (update is_read + read_at)
CREATE POLICY notif_update ON public.notifications FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());
-- Inserts only from SECURITY DEFINER functions (server-side)
CREATE POLICY notif_insert ON public.notifications FOR INSERT WITH CHECK (false);
CREATE POLICY notif_delete ON public.notifications FOR DELETE USING (false);

-- Stub: future channel config (not implemented in V1)
CREATE TABLE public.notification_channel_configs (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel    text NOT NULL CHECK (channel IN ('email', 'whatsapp', 'push')),
  config     jsonb,
  is_active  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_channel_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY notif_chan_select ON public.notification_channel_configs FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY notif_chan_insert ON public.notification_channel_configs FOR INSERT WITH CHECK (false);
CREATE POLICY notif_chan_update ON public.notification_channel_configs FOR UPDATE USING (false);
CREATE POLICY notif_chan_delete ON public.notification_channel_configs FOR DELETE USING (false);

-- ── Audit Logs ────────────────────────────────────────────────────────────

CREATE TABLE public.audit_logs (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name text NOT NULL,
  record_id  uuid NOT NULL,
  action     text NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  actor_id   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  old_data   jsonb,
  new_data   jsonb,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_record  ON public.audit_logs(table_name, record_id);
CREATE INDEX idx_audit_actor   ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
-- Only super_admin can read audit logs from client
CREATE POLICY audit_select ON public.audit_logs FOR SELECT
  USING ((SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY audit_insert ON public.audit_logs FOR INSERT WITH CHECK (false);
CREATE POLICY audit_update ON public.audit_logs FOR UPDATE USING (false);
CREATE POLICY audit_delete ON public.audit_logs FOR DELETE USING (false);

-- ── Analytics Pre-Aggregation ─────────────────────────────────────────────

CREATE TABLE public.case_daily_summary (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  summary_date         date NOT NULL,           -- in warehouse local timezone
  warehouse_id         uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  category_id          uuid REFERENCES public.case_categories(id) ON DELETE SET NULL,
  priority             text CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status               text,
  total_cases          int NOT NULL DEFAULT 0,
  closed_cases         int NOT NULL DEFAULT 0,
  avg_resolution_hours numeric,
  overdue_cases        int NOT NULL DEFAULT 0,
  refreshed_at         timestamptz NOT NULL DEFAULT now(),

  UNIQUE(summary_date, warehouse_id, category_id, priority, status)
);

CREATE INDEX idx_daily_summary ON public.case_daily_summary(warehouse_id, summary_date DESC);

ALTER TABLE public.case_daily_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY summary_select ON public.case_daily_summary FOR SELECT
  USING (
    warehouse_id = ANY(
      CASE
        WHEN (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())
        THEN ARRAY(SELECT id FROM public.warehouses WHERE is_active = true)
        ELSE ARRAY(SELECT DISTINCT warehouse_id FROM public.user_warehouses
                   WHERE user_id = auth.uid() AND is_active = true)
      END
    )
  );
CREATE POLICY summary_insert ON public.case_daily_summary FOR INSERT WITH CHECK (false);
CREATE POLICY summary_update ON public.case_daily_summary FOR UPDATE USING (false);
CREATE POLICY summary_delete ON public.case_daily_summary FOR DELETE USING (false);


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: 016_rls_functions.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 016_rls_functions.sql
-- Core RLS helper functions — SECURITY DEFINER with hardened search_path
-- Depends on: profiles (002), warehouses (004), user_warehouses (004),
--             role_capabilities (003), case_assignments (013)

-- ── get_user_warehouse_ids ────────────────────────────────────────────────
-- Returns all warehouse_ids accessible to current authenticated user.
-- Super admins get all active warehouses.

CREATE OR REPLACE FUNCTION public.get_user_warehouse_ids()
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT CASE
    WHEN (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())
    THEN ARRAY(SELECT id FROM public.warehouses WHERE is_active = true)
    ELSE ARRAY(
      SELECT DISTINCT warehouse_id
      FROM public.user_warehouses
      WHERE user_id = auth.uid() AND is_active = true
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.get_user_warehouse_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_warehouse_ids() TO authenticated;

-- ── has_capability ────────────────────────────────────────────────────────
-- Returns true if current user holds the given capability in the given warehouse.
-- Unions across ALL active roles the user holds in that warehouse.
-- Super admins always return true.
-- STABLE: PostgreSQL may cache result within a single query (improves RLS perf).

CREATE OR REPLACE FUNCTION public.has_capability(
  p_warehouse_id uuid,
  p_capability   text
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.user_warehouses uw
      JOIN public.role_capabilities rc ON rc.role_id = uw.role_id
      WHERE uw.user_id      = auth.uid()
        AND uw.warehouse_id = p_warehouse_id
        AND uw.is_active    = true
        AND rc.capability   = p_capability
    );
$$;

REVOKE ALL ON FUNCTION public.has_capability(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_capability(uuid, text) TO authenticated;

-- ── is_case_participant ───────────────────────────────────────────────────
-- Returns true if current user is reporter OR current assignee of the case.
-- Used in child table RLS policies.

CREATE OR REPLACE FUNCTION public.is_case_participant(p_case_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.cases
      WHERE id = p_case_id AND reporter_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.case_assignments
      WHERE case_id = p_case_id
        AND assignee_id = auth.uid()
        AND is_current = true
    );
$$;

REVOKE ALL ON FUNCTION public.is_case_participant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_case_participant(uuid) TO authenticated;

-- ── log_case_activity ─────────────────────────────────────────────────────
-- Internal helper for activity logging — called from controlled mutation RPCs.
-- Actor always derived from auth.uid(), never from caller parameter.

CREATE OR REPLACE FUNCTION public.log_case_activity(
  p_case_id    uuid,
  p_action     text,
  p_from_status text DEFAULT NULL,
  p_to_status   text DEFAULT NULL,
  p_metadata    jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.case_activities (
    case_id, actor_id, action, from_status, to_status, metadata
  ) VALUES (
    p_case_id, auth.uid(), p_action, p_from_status, p_to_status, p_metadata
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_case_activity(uuid, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_case_activity(uuid, text, text, text, jsonb) TO authenticated;

-- ── send_notification ─────────────────────────────────────────────────────
-- Internal helper for sending in-app notifications from server-side RPCs.

CREATE OR REPLACE FUNCTION public.send_notification(
  p_recipient_id uuid,
  p_type         text,
  p_title        text,
  p_body         text DEFAULT NULL,
  p_data         jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.notifications (recipient_id, type, title, body, data)
  VALUES (p_recipient_id, p_type, p_title, p_body, p_data)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.send_notification(uuid, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_notification(uuid, text, text, text, jsonb) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: 017_rls_policies_upgrade.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 017_rls_policies_upgrade.sql
-- Upgrade RLS policies on cases, assets, inspections to use has_capability()
-- Replaces the temporary warehouse-only policies from earlier migrations.
-- Depends on: 016_rls_functions.sql (has_capability, is_case_participant)

-- ═══════════════════════════════════════════════════════════
-- CASES — replace temporary policies with capability-based
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS cases_select ON public.cases;
DROP POLICY IF EXISTS cases_insert ON public.cases;
DROP POLICY IF EXISTS cases_update ON public.cases;

CREATE POLICY cases_select ON public.cases FOR SELECT USING (
  warehouse_id = ANY(public.get_user_warehouse_ids())
  AND (
    public.has_capability(warehouse_id, 'case.view_all')
    OR (
      public.has_capability(warehouse_id, 'case.view_assigned')
      AND (
        reporter_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.case_assignments ca
          WHERE ca.case_id = cases.id
            AND ca.assignee_id = auth.uid()
            AND ca.is_current = true
        )
      )
    )
    OR (
      public.has_capability(warehouse_id, 'case.view_own')
      AND reporter_id = auth.uid()
    )
  )
);

-- INSERT: only via create_case() RPC (controlled mutation)
-- UPDATE: only via dedicated mutation RPCs — client cannot UPDATE directly
-- These policies remain false; mutations use SECURITY DEFINER functions

-- ═══════════════════════════════════════════════════════════
-- ASSETS — upgrade to use has_capability
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS assets_select ON public.assets;
DROP POLICY IF EXISTS assets_insert ON public.assets;
DROP POLICY IF EXISTS assets_update ON public.assets;
DROP POLICY IF EXISTS assets_delete ON public.assets;

CREATE POLICY assets_select ON public.assets FOR SELECT USING (
  warehouse_id = ANY(public.get_user_warehouse_ids())
  AND public.has_capability(warehouse_id, 'asset.view')
);
CREATE POLICY assets_insert ON public.assets FOR INSERT WITH CHECK (
  warehouse_id = ANY(public.get_user_warehouse_ids())
  AND public.has_capability(warehouse_id, 'asset.manage')
);
CREATE POLICY assets_update ON public.assets FOR UPDATE USING (
  warehouse_id = ANY(public.get_user_warehouse_ids())
  AND public.has_capability(warehouse_id, 'asset.manage')
) WITH CHECK (warehouse_id = ANY(public.get_user_warehouse_ids()));
CREATE POLICY assets_delete ON public.assets FOR DELETE USING (
  warehouse_id = ANY(public.get_user_warehouse_ids())
  AND public.has_capability(warehouse_id, 'asset.manage')
);

-- ═══════════════════════════════════════════════════════════
-- INSPECTIONS — upgrade to use has_capability
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS inspections_select ON public.inspections;
DROP POLICY IF EXISTS inspections_insert ON public.inspections;
DROP POLICY IF EXISTS inspections_update ON public.inspections;

CREATE POLICY inspections_select ON public.inspections FOR SELECT USING (
  warehouse_id = ANY(public.get_user_warehouse_ids())
  AND public.has_capability(warehouse_id, 'inspection.view')
);
CREATE POLICY inspections_insert ON public.inspections FOR INSERT WITH CHECK (
  warehouse_id = ANY(public.get_user_warehouse_ids())
  AND public.has_capability(warehouse_id, 'inspection.start')
  AND inspector_id = auth.uid()
);
CREATE POLICY inspections_update ON public.inspections FOR UPDATE USING (
  warehouse_id = ANY(public.get_user_warehouse_ids())
  AND (
    inspector_id = auth.uid()
    OR public.has_capability(warehouse_id, 'case.assign')
  )
) WITH CHECK (warehouse_id = ANY(public.get_user_warehouse_ids()));

-- ═══════════════════════════════════════════════════════════
-- CASE ASSIGNMENTS — upgrade to use has_capability
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS case_assign_select ON public.case_assignments;
DROP POLICY IF EXISTS case_assign_insert ON public.case_assignments;
DROP POLICY IF EXISTS case_assign_update ON public.case_assignments;

CREATE POLICY case_assign_select ON public.case_assignments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = case_assignments.case_id
      AND c.warehouse_id = ANY(public.get_user_warehouse_ids())
      AND (
        public.has_capability(c.warehouse_id, 'case.view_all')
        OR assignee_id = auth.uid()
        OR c.reporter_id = auth.uid()
      )
  )
);
-- INSERT/UPDATE via assign_case() RPC only
CREATE POLICY case_assign_insert ON public.case_assignments FOR INSERT WITH CHECK (false);
CREATE POLICY case_assign_update ON public.case_assignments FOR UPDATE USING (false);

-- ═══════════════════════════════════════════════════════════
-- CASE ACTIVITIES — upgrade child table visibility
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS activities_select ON public.case_activities;

CREATE POLICY activities_select ON public.case_activities FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = case_activities.case_id
      AND c.warehouse_id = ANY(public.get_user_warehouse_ids())
      AND (
        public.has_capability(c.warehouse_id, 'case.view_all')
        OR public.is_case_participant(c.id)
      )
  )
);

-- ═══════════════════════════════════════════════════════════
-- CASE EVIDENCES — upgrade to use has_capability
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS evidences_select ON public.case_evidences;
DROP POLICY IF EXISTS evidences_insert ON public.case_evidences;

CREATE POLICY evidences_select ON public.case_evidences FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = case_evidences.case_id
      AND c.warehouse_id = ANY(public.get_user_warehouse_ids())
      AND (
        public.has_capability(c.warehouse_id, 'case.view_all')
        OR public.is_case_participant(c.id)
      )
  )
);
CREATE POLICY evidences_insert ON public.case_evidences FOR INSERT WITH CHECK (
  uploader_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = case_evidences.case_id
      AND public.has_capability(c.warehouse_id, 'evidence.upload')
      AND (
        public.has_capability(c.warehouse_id, 'case.view_all')
        OR public.is_case_participant(c.id)
      )
  )
);

-- ═══════════════════════════════════════════════════════════
-- DUE DATE CHANGES — upgrade
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS due_changes_select ON public.due_date_changes;
DROP POLICY IF EXISTS due_changes_insert ON public.due_date_changes;

CREATE POLICY due_changes_select ON public.due_date_changes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = due_date_changes.case_id
      AND c.warehouse_id = ANY(public.get_user_warehouse_ids())
      AND (
        public.has_capability(c.warehouse_id, 'case.view_all')
        OR public.is_case_participant(c.id)
      )
  )
);
-- INSERT only via override_case_due_date() RPC
CREATE POLICY due_changes_insert ON public.due_date_changes FOR INSERT WITH CHECK (false);

-- ═══════════════════════════════════════════════════════════
-- MAINTENANCE ACTIONS — upgrade to use has_capability
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS maint_select ON public.maintenance_actions;
DROP POLICY IF EXISTS maint_insert ON public.maintenance_actions;
DROP POLICY IF EXISTS maint_update ON public.maintenance_actions;

CREATE POLICY maint_select ON public.maintenance_actions FOR SELECT USING (
  warehouse_id = ANY(public.get_user_warehouse_ids())
  AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = maintenance_actions.case_id
      AND (
        public.has_capability(c.warehouse_id, 'case.view_all')
        OR public.is_case_participant(c.id)
      )
  )
);
-- Mutations via controlled RPCs only
CREATE POLICY maint_insert ON public.maintenance_actions FOR INSERT WITH CHECK (false);
CREATE POLICY maint_update ON public.maintenance_actions FOR UPDATE USING (false);

-- ═══════════════════════════════════════════════════════════
-- INSPECTION RESULTS — upgrade
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS insp_results_select ON public.inspection_results;
DROP POLICY IF EXISTS insp_results_insert ON public.inspection_results;
DROP POLICY IF EXISTS insp_results_update ON public.inspection_results;

CREATE POLICY insp_results_select ON public.inspection_results FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.inspections i
    WHERE i.id = inspection_results.inspection_id
      AND i.warehouse_id = ANY(public.get_user_warehouse_ids())
      AND public.has_capability(i.warehouse_id, 'inspection.view')
  )
);
CREATE POLICY insp_results_insert ON public.inspection_results FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.inspections i
    WHERE i.id = inspection_results.inspection_id
      AND public.has_capability(i.warehouse_id, 'inspection.start')
      AND i.inspector_id = auth.uid()
      AND i.status = 'draft'
  )
);
CREATE POLICY insp_results_update ON public.inspection_results FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.inspections i
    WHERE i.id = inspection_results.inspection_id
      AND i.inspector_id = auth.uid()
      AND i.status = 'draft'
  )
);

-- ═══════════════════════════════════════════════════════════
-- INSPECTION EVIDENCES — upgrade
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS insp_ev_select ON public.inspection_evidences;
DROP POLICY IF EXISTS insp_ev_insert ON public.inspection_evidences;

CREATE POLICY insp_ev_select ON public.inspection_evidences FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.inspections i
    WHERE i.id = inspection_evidences.inspection_id
      AND i.warehouse_id = ANY(public.get_user_warehouse_ids())
      AND public.has_capability(i.warehouse_id, 'inspection.view')
  )
);
CREATE POLICY insp_ev_insert ON public.inspection_evidences FOR INSERT WITH CHECK (
  uploader_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.inspections i
    WHERE i.id = inspection_evidences.inspection_id
      AND public.has_capability(i.warehouse_id, 'evidence.upload')
      AND (
        i.inspector_id = auth.uid()
        OR public.has_capability(i.warehouse_id, 'case.view_all')
      )
  )
);


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: 018_integrity_triggers.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 018_integrity_triggers.sql
-- Cross-warehouse integrity triggers and additional constraints
-- Depends on: all tables created in 001–015

-- ── 1. Warehouse code immutability ────────────────────────────────────────
-- Prevents warehouses.code from being changed once cases reference the warehouse.

CREATE OR REPLACE FUNCTION public.trg_warehouse_code_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.code <> OLD.code THEN
    IF EXISTS (SELECT 1 FROM public.cases WHERE warehouse_id = OLD.id LIMIT 1) THEN
      RAISE EXCEPTION
        'Cannot change warehouse code "%" — cases already reference this warehouse (id: %)',
        OLD.code, OLD.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_warehouse_code_immutable
  BEFORE UPDATE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION public.trg_warehouse_code_immutable();

-- ── 2. maintenance_actions warehouse = case warehouse ─────────────────────
-- Prevents maintenance action from belonging to a different warehouse than its case.

CREATE OR REPLACE FUNCTION public.trg_maintenance_warehouse_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.cases
    WHERE id = NEW.case_id AND warehouse_id = NEW.warehouse_id
  ) THEN
    RAISE EXCEPTION
      'maintenance_actions.warehouse_id (%) does not match the warehouse of case % ',
      NEW.warehouse_id, NEW.case_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_maintenance_warehouse
  BEFORE INSERT OR UPDATE ON public.maintenance_actions
  FOR EACH ROW EXECUTE FUNCTION public.trg_maintenance_warehouse_check();

-- ── 3. inspection_evidences result belongs to same inspection ─────────────
-- If inspection_result_id is not NULL, that result must belong to same inspection_id.

CREATE OR REPLACE FUNCTION public.trg_insp_evidence_result_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.inspection_result_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.inspection_results
      WHERE id = NEW.inspection_result_id
        AND inspection_id = NEW.inspection_id
    ) THEN
      RAISE EXCEPTION
        'inspection_evidences.inspection_result_id (%) does not belong to inspection %',
        NEW.inspection_result_id, NEW.inspection_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_insp_evidence_result
  BEFORE INSERT OR UPDATE ON public.inspection_evidences
  FOR EACH ROW EXECUTE FUNCTION public.trg_insp_evidence_result_check();

-- ── 4. case_assignments — assignment replacement must be transactional ─────
-- Enforces: only one is_current = true assignment per case.
-- (The partial unique index on 013 handles this, but we add a trigger for
--  clear error messaging when someone attempts double-assignment)

CREATE OR REPLACE FUNCTION public.trg_case_assignment_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_current = true THEN
    IF EXISTS (
      SELECT 1 FROM public.case_assignments
      WHERE case_id = NEW.case_id
        AND is_current = true
        AND id <> NEW.id
    ) THEN
      RAISE EXCEPTION
        'Case % already has a current assignment. Unset is_current on existing assignment first.',
        NEW.case_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_case_assignment_check
  BEFORE INSERT OR UPDATE ON public.case_assignments
  FOR EACH ROW EXECUTE FUNCTION public.trg_case_assignment_check();

-- ── 5. case status transition validation ──────────────────────────────────
-- Allowed transitions (enforced at DB level as a safety net):
-- open          → on_progress, closed (direct close by admin)
-- on_progress   → waiting_repair, waiting_verification, closed (admin)
-- waiting_repair → on_progress, waiting_verification
-- waiting_verification → closed, on_progress (verification fail)
-- closed        → reopened
-- reopened      → on_progress

CREATE OR REPLACE FUNCTION public.trg_case_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed_next text[];
BEGIN
  -- Skip if status hasn't changed
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  v_allowed_next := CASE OLD.status
    WHEN 'open'                 THEN ARRAY['on_progress', 'closed']
    WHEN 'on_progress'          THEN ARRAY['waiting_repair', 'waiting_verification', 'closed']
    WHEN 'waiting_repair'       THEN ARRAY['on_progress', 'waiting_verification']
    WHEN 'waiting_verification' THEN ARRAY['closed', 'on_progress']
    WHEN 'closed'               THEN ARRAY['reopened']
    WHEN 'reopened'             THEN ARRAY['on_progress', 'waiting_repair', 'waiting_verification', 'closed']
    ELSE ARRAY[]::text[]
  END;

  IF NOT (NEW.status = ANY(v_allowed_next)) THEN
    RAISE EXCEPTION
      'Invalid case status transition: % → % (case %)',
      OLD.status, NEW.status, NEW.id;
  END IF;

  -- Set closed_at when closing
  IF NEW.status = 'closed' AND OLD.status <> 'closed' THEN
    NEW.closed_at = now();
  END IF;

  -- Clear closed_at when reopening
  IF NEW.status = 'reopened' AND OLD.status = 'closed' THEN
    NEW.closed_at = NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_case_status_transition
  BEFORE UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.trg_case_status_transition();


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: 019_seed.sql
-- ═══════════════════════════════════════════════════════════════════════════

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


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: 020_storage_buckets.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 020_storage_buckets.sql
-- Supabase Storage bucket configuration and RLS policies.
-- ALL evidence buckets are PRIVATE — no public access.
-- Signed URLs must be used to serve files.
--
-- Bucket creation is done via Supabase Dashboard or CLI (not SQL).
-- This migration creates the STORAGE RLS POLICIES only.
--
-- Required buckets (create in Dashboard → Storage):
--   case-evidences         (private, max 10MB)
--   inspection-evidences   (private, max 10MB)
--   asset-photos           (private, max 5MB)
--   avatars                (private, max 2MB)
--
-- Object path conventions:
--   case-evidences/{warehouseId}/{caseId}/{uuid}.jpg
--   inspection-evidences/{warehouseId}/{inspectionId}/{uuid}.jpg
--   asset-photos/{warehouseId}/{assetId}/{uuid}.jpg
--   avatars/{userId}/{uuid}.jpg
--
-- A user must NOT be able to access another warehouse's files by guessing paths.
-- Path-based warehouse isolation is enforced in RLS.

-- ── Helper: extract segment N from a storage object name ─────────────────
-- storage.foldername returns ARRAY of path segments
-- segment 1 = warehouseId, segment 2 = recordId

-- ── case-evidences bucket policies ───────────────────────────────────────
-- Path: {warehouseId}/{caseId}/{filename}
-- Access: user must have warehouse access + case visibility

CREATE POLICY "case-evidences: upload by case participants"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'case-evidences'
  -- Segment 1 (index 0) = warehouseId
  AND (storage.foldername(name))[1] = ANY(public.get_user_warehouse_ids()::text[])
  AND public.has_capability(
    (storage.foldername(name))[1]::uuid,
    'evidence.upload'
  )
  AND (
    -- Must be case participant or have view_all
    public.has_capability((storage.foldername(name))[1]::uuid, 'case.view_all')
    OR public.is_case_participant((storage.foldername(name))[2]::uuid)
  )
);

CREATE POLICY "case-evidences: read by case participants"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'case-evidences'
  AND (storage.foldername(name))[1] = ANY(public.get_user_warehouse_ids()::text[])
  AND (
    public.has_capability((storage.foldername(name))[1]::uuid, 'case.view_all')
    OR public.is_case_participant((storage.foldername(name))[2]::uuid)
  )
);

CREATE POLICY "case-evidences: delete by coordinator+"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'case-evidences'
  AND (storage.foldername(name))[1] = ANY(public.get_user_warehouse_ids()::text[])
  AND public.has_capability(
    (storage.foldername(name))[1]::uuid,
    'case.view_all'  -- coordinators and above
  )
);

-- ── inspection-evidences bucket policies ──────────────────────────────────
-- Path: {warehouseId}/{inspectionId}/{filename}

CREATE POLICY "inspection-evidences: upload by inspectors"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'inspection-evidences'
  AND (storage.foldername(name))[1] = ANY(public.get_user_warehouse_ids()::text[])
  AND public.has_capability(
    (storage.foldername(name))[1]::uuid,
    'evidence.upload'
  )
  AND (
    public.has_capability((storage.foldername(name))[1]::uuid, 'inspection.view')
  )
);

CREATE POLICY "inspection-evidences: read by warehouse members with inspection.view"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'inspection-evidences'
  AND (storage.foldername(name))[1] = ANY(public.get_user_warehouse_ids()::text[])
  AND public.has_capability(
    (storage.foldername(name))[1]::uuid,
    'inspection.view'
  )
);

CREATE POLICY "inspection-evidences: delete by coordinator+"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'inspection-evidences'
  AND (storage.foldername(name))[1] = ANY(public.get_user_warehouse_ids()::text[])
  AND public.has_capability(
    (storage.foldername(name))[1]::uuid,
    'inspection.manage_template'
  )
);

-- ── asset-photos bucket policies ──────────────────────────────────────────
-- Path: {warehouseId}/{assetId}/{filename}

CREATE POLICY "asset-photos: upload by asset.manage"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'asset-photos'
  AND (storage.foldername(name))[1] = ANY(public.get_user_warehouse_ids()::text[])
  AND public.has_capability(
    (storage.foldername(name))[1]::uuid,
    'asset.manage'
  )
);

CREATE POLICY "asset-photos: read by asset.view"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'asset-photos'
  AND (storage.foldername(name))[1] = ANY(public.get_user_warehouse_ids()::text[])
  AND public.has_capability(
    (storage.foldername(name))[1]::uuid,
    'asset.view'
  )
);

CREATE POLICY "asset-photos: delete by asset.manage"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'asset-photos'
  AND (storage.foldername(name))[1] = ANY(public.get_user_warehouse_ids()::text[])
  AND public.has_capability(
    (storage.foldername(name))[1]::uuid,
    'asset.manage'
  )
);

-- ── avatars bucket policies ───────────────────────────────────────────────
-- Path: {userId}/{filename}
-- Users can manage only their own avatar.

CREATE POLICY "avatars: upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "avatars: read any avatar (profile display)"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "avatars: delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: 021_controlled_mutation_rpcs.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 021_controlled_mutation_rpcs.sql
-- All controlled case mutation RPCs.
-- Each function:
--   - derives actor from auth.uid() ONLY — never trusts caller-supplied identity
--   - validates warehouse access
--   - validates capability
--   - validates current state / allowed transition
--   - performs multi-step writes in an implicit transaction (plpgsql function = single txn)
--   - logs activity
--   - sends in-app notifications
--   - uses SECURITY DEFINER + SET search_path = public
--   - restricts EXECUTE to authenticated only

-- ══════════════════════════════════════════════════════════════════════════
-- create_case
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.create_case(
  p_warehouse_id          uuid,
  p_title                 text,
  p_description           text DEFAULT NULL,
  p_category_id           uuid DEFAULT NULL,
  p_subcategory_id        uuid DEFAULT NULL,
  p_area_id               uuid DEFAULT NULL,
  p_location_id           uuid DEFAULT NULL,
  p_asset_id              uuid DEFAULT NULL,
  p_inspection_id         uuid DEFAULT NULL,
  p_priority              text DEFAULT 'medium',
  p_has_operational_impact boolean DEFAULT false,
  p_requires_maintenance  boolean DEFAULT false,
  p_source                text DEFAULT 'direct',
  -- case_number is generated internally — caller cannot supply it
  p_due_date              timestamptz DEFAULT NULL
)
RETURNS uuid   -- returns new case id
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id     uuid := auth.uid();
  v_case_id      uuid;
  v_case_number  text;
  v_wh_code      text;
  v_wh_tz        text;
  v_seq          int;
  v_display_date text;
  v_local_date   date;
BEGIN
  -- 1. Validate actor is authenticated
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Validate capability
  IF NOT public.has_capability(p_warehouse_id, 'case.create') THEN
    RAISE EXCEPTION 'Permission denied: missing case.create capability in warehouse %', p_warehouse_id;
  END IF;

  -- 3. Validate warehouse is active
  SELECT code, timezone INTO v_wh_code, v_wh_tz
    FROM public.warehouses
   WHERE id = p_warehouse_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Warehouse % not found or inactive', p_warehouse_id;
  END IF;

  -- 4. Validate priority
  IF p_priority NOT IN ('low', 'medium', 'high', 'critical') THEN
    RAISE EXCEPTION 'Invalid priority: %', p_priority;
  END IF;

  -- 5. Validate source
  IF p_source NOT IN ('direct', 'inspection') THEN
    RAISE EXCEPTION 'Invalid source: %', p_source;
  END IF;

  -- 6. Validate subcategory belongs to category (if both provided)
  IF p_subcategory_id IS NOT NULL AND p_category_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.case_subcategories
      WHERE id = p_subcategory_id AND category_id = p_category_id
    ) THEN
      RAISE EXCEPTION 'Subcategory % does not belong to category %', p_subcategory_id, p_category_id;
    END IF;
  END IF;

  -- 7. Validate area/location/asset/inspection belong to same warehouse
  IF p_area_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.areas WHERE id = p_area_id AND warehouse_id = p_warehouse_id) THEN
      RAISE EXCEPTION 'Area % does not belong to warehouse %', p_area_id, p_warehouse_id;
    END IF;
  END IF;
  IF p_location_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.locations WHERE id = p_location_id AND warehouse_id = p_warehouse_id) THEN
      RAISE EXCEPTION 'Location % does not belong to warehouse %', p_location_id, p_warehouse_id;
    END IF;
  END IF;
  IF p_asset_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.assets WHERE id = p_asset_id AND warehouse_id = p_warehouse_id) THEN
      RAISE EXCEPTION 'Asset % does not belong to warehouse %', p_asset_id, p_warehouse_id;
    END IF;
  END IF;
  IF p_inspection_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.inspections WHERE id = p_inspection_id AND warehouse_id = p_warehouse_id) THEN
      RAISE EXCEPTION 'Inspection % does not belong to warehouse %', p_inspection_id, p_warehouse_id;
    END IF;
  END IF;

  -- 8. Generate case number atomically
  -- Use warehouse timezone for the date portion
  v_local_date   := (now() AT TIME ZONE v_wh_tz)::date;
  v_display_date := to_char(now() AT TIME ZONE v_wh_tz, 'YYMMDD');

  INSERT INTO public.case_sequences (warehouse_id, sequence_date, last_sequence)
  VALUES (p_warehouse_id, v_local_date, 1)
  ON CONFLICT (warehouse_id, sequence_date)
  DO UPDATE SET last_sequence = public.case_sequences.last_sequence + 1
  RETURNING last_sequence INTO v_seq;

  v_case_number := 'WHC-' || v_wh_code || '-' || v_display_date || '-' || lpad(v_seq::text, 3, '0');

  -- 9. Insert case
  INSERT INTO public.cases (
    case_number, title, description, category_id, subcategory_id,
    warehouse_id, area_id, location_id, asset_id, inspection_id,
    reporter_id, priority, status, has_operational_impact, requires_maintenance,
    source, due_date
  ) VALUES (
    v_case_number, p_title, p_description, p_category_id, p_subcategory_id,
    p_warehouse_id, p_area_id, p_location_id, p_asset_id, p_inspection_id,
    v_actor_id, p_priority, 'open', p_has_operational_impact, p_requires_maintenance,
    p_source, p_due_date
  )
  RETURNING id INTO v_case_id;

  -- 10. Log activity
  PERFORM public.log_case_activity(v_case_id, 'created', NULL, 'open', NULL);

  RETURN v_case_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_case(uuid,text,text,uuid,uuid,uuid,uuid,uuid,uuid,text,boolean,boolean,text,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_case(uuid,text,text,uuid,uuid,uuid,uuid,uuid,uuid,text,boolean,boolean,text,timestamptz) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- assign_case
-- Atomically: unset previous assignment + insert new + log + notify
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.assign_case(
  p_case_id    uuid,
  p_assignee_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id   uuid := auth.uid();
  v_case       record;
  v_assignee   record;
BEGIN
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Load case (RLS already filters rows — but we also check capability explicitly)
  SELECT id, warehouse_id, status, case_number, title
    INTO v_case FROM public.cases WHERE id = p_case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Case % not found', p_case_id; END IF;

  -- Validate capability
  IF NOT public.has_capability(v_case.warehouse_id, 'case.assign') THEN
    RAISE EXCEPTION 'Permission denied: missing case.assign capability';
  END IF;

  -- Cannot assign a closed case
  IF v_case.status = 'closed' THEN
    RAISE EXCEPTION 'Cannot assign a closed case';
  END IF;

  -- Validate assignee is an active member of the same warehouse
  IF NOT EXISTS (
    SELECT 1 FROM public.user_warehouses
    WHERE user_id = p_assignee_id AND warehouse_id = v_case.warehouse_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Assignee % is not an active member of warehouse %', p_assignee_id, v_case.warehouse_id;
  END IF;

  SELECT full_name INTO v_assignee FROM public.profiles WHERE id = p_assignee_id;

  -- Unset current assignment
  UPDATE public.case_assignments
     SET is_current = false, unassigned_at = now()
   WHERE case_id = p_case_id AND is_current = true;

  -- Insert new assignment
  INSERT INTO public.case_assignments (case_id, assignee_id, assigned_by, is_current)
  VALUES (p_case_id, p_assignee_id, v_actor_id, true);

  -- Transition to on_progress if open or reopened
  IF v_case.status IN ('open', 'reopened') THEN
    UPDATE public.cases SET status = 'on_progress' WHERE id = p_case_id;
    PERFORM public.log_case_activity(p_case_id, 'status_changed', v_case.status, 'on_progress',
      jsonb_build_object('reason', 'assigned'));
  END IF;

  -- Log assignment activity
  PERFORM public.log_case_activity(p_case_id, 'assigned', NULL, NULL,
    jsonb_build_object('assignee_id', p_assignee_id, 'assignee_name', v_assignee.full_name));

  -- Notify assignee
  PERFORM public.send_notification(
    p_assignee_id,
    'case_assigned',
    'Case ditugaskan ke kamu',
    v_case.case_number || ': ' || v_case.title,
    jsonb_build_object('case_id', p_case_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.assign_case(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_case(uuid, uuid) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- update_case_progress
-- PIC/coordinator can update description, notes, maintenance fields.
-- CANNOT change: reporter_id, warehouse_id, priority (needs change_case_priority),
--                due_date (needs override_case_due_date), closed_at, root_cause
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.update_case_progress(
  p_case_id             uuid,
  p_description         text DEFAULT NULL,
  p_corrective_action   text DEFAULT NULL,
  p_preventive_action   text DEFAULT NULL,
  p_root_cause_id       uuid DEFAULT NULL,
  p_has_operational_impact boolean DEFAULT NULL,
  p_requires_maintenance   boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_case     record;
BEGIN
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT id, warehouse_id, status INTO v_case FROM public.cases WHERE id = p_case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Case % not found', p_case_id; END IF;

  -- Validate capability
  IF NOT (
    public.has_capability(v_case.warehouse_id, 'case.update_progress')
    OR public.has_capability(v_case.warehouse_id, 'case.view_all')
  ) THEN
    RAISE EXCEPTION 'Permission denied: missing case.update_progress capability';
  END IF;

  -- Must be assigned to case (for PIC) or have view_all
  IF NOT (
    public.has_capability(v_case.warehouse_id, 'case.view_all')
    OR public.is_case_participant(p_case_id)
  ) THEN
    RAISE EXCEPTION 'Permission denied: not a case participant';
  END IF;

  -- Cannot update a closed case
  IF v_case.status = 'closed' THEN
    RAISE EXCEPTION 'Cannot update a closed case. Use reopen_case first.';
  END IF;

  -- Apply only non-null fields
  UPDATE public.cases SET
    description           = COALESCE(p_description, description),
    corrective_action     = COALESCE(p_corrective_action, corrective_action),
    preventive_action     = COALESCE(p_preventive_action, preventive_action),
    root_cause_id         = COALESCE(p_root_cause_id, root_cause_id),
    has_operational_impact = COALESCE(p_has_operational_impact, has_operational_impact),
    requires_maintenance   = COALESCE(p_requires_maintenance, requires_maintenance)
  WHERE id = p_case_id;

  PERFORM public.log_case_activity(p_case_id, 'maintenance_updated', NULL, NULL,
    jsonb_build_object('actor_id', v_actor_id));
END;
$$;

REVOKE ALL ON FUNCTION public.update_case_progress(uuid,text,text,text,uuid,boolean,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_case_progress(uuid,text,text,text,uuid,boolean,boolean) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- change_case_priority
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.change_case_priority(
  p_case_id uuid,
  p_priority text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id   uuid := auth.uid();
  v_case       record;
  v_old_priority text;
BEGIN
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_priority NOT IN ('low', 'medium', 'high', 'critical') THEN
    RAISE EXCEPTION 'Invalid priority: %', p_priority;
  END IF;

  SELECT id, warehouse_id, status, priority INTO v_case FROM public.cases WHERE id = p_case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Case % not found', p_case_id; END IF;

  IF NOT public.has_capability(v_case.warehouse_id, 'case.change_priority') THEN
    RAISE EXCEPTION 'Permission denied: missing case.change_priority capability';
  END IF;

  IF v_case.status = 'closed' THEN
    RAISE EXCEPTION 'Cannot change priority of a closed case';
  END IF;

  v_old_priority := v_case.priority;
  UPDATE public.cases SET priority = p_priority WHERE id = p_case_id;

  PERFORM public.log_case_activity(p_case_id, 'priority_changed', NULL, NULL,
    jsonb_build_object('from', v_old_priority, 'to', p_priority));
END;
$$;

REVOKE ALL ON FUNCTION public.change_case_priority(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.change_case_priority(uuid, text) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- override_case_due_date
-- Requires reason (NOT NULL enforced here + in app)
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.override_case_due_date(
  p_case_id    uuid,
  p_new_due_date timestamptz,
  p_reason     text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id     uuid := auth.uid();
  v_case         record;
  v_old_due_date timestamptz;
BEGIN
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Reason is required when overriding due date';
  END IF;
  IF p_new_due_date IS NULL THEN
    RAISE EXCEPTION 'New due date cannot be null';
  END IF;

  SELECT id, warehouse_id, status, due_date INTO v_case FROM public.cases WHERE id = p_case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Case % not found', p_case_id; END IF;

  IF NOT public.has_capability(v_case.warehouse_id, 'case.override_due_date') THEN
    RAISE EXCEPTION 'Permission denied: missing case.override_due_date capability';
  END IF;

  IF v_case.status = 'closed' THEN
    RAISE EXCEPTION 'Cannot change due date of a closed case';
  END IF;

  v_old_due_date := v_case.due_date;

  -- Update due date
  UPDATE public.cases SET due_date = p_new_due_date WHERE id = p_case_id;

  -- Record in audit trail (reason stored here permanently)
  INSERT INTO public.due_date_changes (case_id, changed_by, previous_due_date, new_due_date, reason)
  VALUES (p_case_id, v_actor_id, COALESCE(v_old_due_date, now()), p_new_due_date, p_reason);

  PERFORM public.log_case_activity(p_case_id, 'due_date_overridden', NULL, NULL,
    jsonb_build_object('from', v_old_due_date, 'to', p_new_due_date, 'reason', p_reason));
END;
$$;

REVOKE ALL ON FUNCTION public.override_case_due_date(uuid, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.override_case_due_date(uuid, timestamptz, text) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- request_case_verification
-- PIC requests coordinator/QC to verify the fix.
-- Allowed transitions: on_progress → waiting_verification
--                      waiting_repair → waiting_verification
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.request_case_verification(p_case_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_case     record;
BEGIN
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT id, warehouse_id, status INTO v_case FROM public.cases WHERE id = p_case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Case % not found', p_case_id; END IF;

  IF NOT public.has_capability(v_case.warehouse_id, 'case.request_verification') THEN
    RAISE EXCEPTION 'Permission denied: missing case.request_verification capability';
  END IF;

  -- Must be assigned to case
  IF NOT (public.is_case_participant(p_case_id) OR public.has_capability(v_case.warehouse_id, 'case.view_all')) THEN
    RAISE EXCEPTION 'Permission denied: not a case participant';
  END IF;

  IF v_case.status NOT IN ('on_progress', 'waiting_repair') THEN
    RAISE EXCEPTION 'Can only request verification from on_progress or waiting_repair (current: %)', v_case.status;
  END IF;

  UPDATE public.cases SET status = 'waiting_verification' WHERE id = p_case_id;

  PERFORM public.log_case_activity(p_case_id, 'status_changed',
    v_case.status, 'waiting_verification', NULL);

  -- Notify warehouse coordinators (those with case.verify capability)
  -- Notification is sent to the reporter as acknowledgement
  INSERT INTO public.notifications (recipient_id, type, title, data)
  SELECT uw.user_id, 'waiting_verification',
         'Case menunggu verifikasi',
         jsonb_build_object('case_id', p_case_id)
  FROM public.user_warehouses uw
  JOIN public.role_capabilities rc ON rc.role_id = uw.role_id
  WHERE uw.warehouse_id = v_case.warehouse_id
    AND uw.is_active    = true
    AND rc.capability   = 'case.verify'
    AND uw.user_id     <> v_actor_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_case_verification(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_case_verification(uuid) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- verify_case
-- Closes the case (or rejects → back to on_progress).
-- Verifier MUST NOT be the PIC/assignee.
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.verify_case(
  p_case_id  uuid,
  p_approved boolean,
  p_note     text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id  uuid := auth.uid();
  v_case      record;
  v_assignee  uuid;
BEGIN
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT id, warehouse_id, status, reporter_id INTO v_case FROM public.cases WHERE id = p_case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Case % not found', p_case_id; END IF;

  IF NOT public.has_capability(v_case.warehouse_id, 'case.verify') THEN
    RAISE EXCEPTION 'Permission denied: missing case.verify capability';
  END IF;

  IF v_case.status <> 'waiting_verification' THEN
    RAISE EXCEPTION 'Case is not in waiting_verification status (current: %)', v_case.status;
  END IF;

  -- Verifier cannot be the current assignee
  SELECT assignee_id INTO v_assignee
    FROM public.case_assignments
   WHERE case_id = p_case_id AND is_current = true;

  IF v_assignee IS NOT NULL AND v_assignee = v_actor_id THEN
    RAISE EXCEPTION 'Verifier cannot be the current assignee (PIC cannot verify own work)';
  END IF;

  IF p_approved THEN
    -- Close case
    UPDATE public.cases
       SET status = 'closed', closed_at = now()
     WHERE id = p_case_id;

    PERFORM public.log_case_activity(p_case_id, 'verified',
      'waiting_verification', 'closed',
      jsonb_build_object('note', p_note, 'verifier_id', v_actor_id));

    -- Notify reporter and assignee
    PERFORM public.send_notification(v_case.reporter_id, 'case_closed',
      'Case diselesaikan', p_note, jsonb_build_object('case_id', p_case_id));
    IF v_assignee IS NOT NULL AND v_assignee <> v_case.reporter_id THEN
      PERFORM public.send_notification(v_assignee, 'case_closed',
        'Case diselesaikan', p_note, jsonb_build_object('case_id', p_case_id));
    END IF;
  ELSE
    -- Reject: back to on_progress
    UPDATE public.cases SET status = 'on_progress' WHERE id = p_case_id;

    PERFORM public.log_case_activity(p_case_id, 'verification_failed',
      'waiting_verification', 'on_progress',
      jsonb_build_object('note', p_note, 'verifier_id', v_actor_id));

    -- Notify assignee
    IF v_assignee IS NOT NULL THEN
      PERFORM public.send_notification(v_assignee, 'verification_failed',
        'Verifikasi ditolak', p_note, jsonb_build_object('case_id', p_case_id));
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_case(uuid, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_case(uuid, boolean, text) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- reopen_case
-- CLOSED is immutable to normal edits. Reopening requires:
--   - case.reopen capability
--   - a reason (NOT NULL)
--   - audit log entry
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.reopen_case(
  p_case_id uuid,
  p_reason  text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_case     record;
  v_assignee uuid;
BEGIN
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Reason is required when reopening a case';
  END IF;

  SELECT id, warehouse_id, status, reporter_id INTO v_case FROM public.cases WHERE id = p_case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Case % not found', p_case_id; END IF;

  IF NOT public.has_capability(v_case.warehouse_id, 'case.reopen') THEN
    RAISE EXCEPTION 'Permission denied: missing case.reopen capability';
  END IF;

  IF v_case.status <> 'closed' THEN
    RAISE EXCEPTION 'Case must be closed to reopen it (current: %)', v_case.status;
  END IF;

  -- Reopen to 'reopened' status
  UPDATE public.cases
     SET status = 'reopened', closed_at = NULL
   WHERE id = p_case_id;

  PERFORM public.log_case_activity(p_case_id, 'reopened',
    'closed', 'reopened',
    jsonb_build_object('reason', p_reason, 'actor_id', v_actor_id));

  -- Notify reporter
  PERFORM public.send_notification(v_case.reporter_id, 'reopened',
    'Case dibuka kembali', p_reason, jsonb_build_object('case_id', p_case_id));

  -- Notify current assignee if exists
  SELECT assignee_id INTO v_assignee
    FROM public.case_assignments
   WHERE case_id = p_case_id AND is_current = true;
  IF v_assignee IS NOT NULL AND v_assignee <> v_case.reporter_id THEN
    PERFORM public.send_notification(v_assignee, 'reopened',
      'Case dibuka kembali', p_reason, jsonb_build_object('case_id', p_case_id));
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.reopen_case(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reopen_case(uuid, text) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- add_case_comment (controlled — validates participant + open status)
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.add_case_comment(
  p_case_id    uuid,
  p_content    text,
  p_is_internal boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_case     record;
  v_comment_id uuid;
BEGIN
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_content IS NULL OR trim(p_content) = '' THEN
    RAISE EXCEPTION 'Comment content cannot be empty';
  END IF;

  SELECT id, warehouse_id, status INTO v_case FROM public.cases WHERE id = p_case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Case % not found', p_case_id; END IF;

  IF NOT (public.is_case_participant(p_case_id) OR public.has_capability(v_case.warehouse_id, 'case.view_all')) THEN
    RAISE EXCEPTION 'Permission denied: not a case participant';
  END IF;

  IF v_case.status = 'closed' THEN
    RAISE EXCEPTION 'Cannot comment on a closed case';
  END IF;

  INSERT INTO public.case_comments (case_id, author_id, content, is_internal)
  VALUES (p_case_id, v_actor_id, p_content, p_is_internal)
  RETURNING id INTO v_comment_id;

  PERFORM public.log_case_activity(p_case_id, 'commented', NULL, NULL,
    jsonb_build_object('comment_id', v_comment_id, 'is_internal', p_is_internal));

  RETURN v_comment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.add_case_comment(uuid, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_case_comment(uuid, text, boolean) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- add_case_evidence (controlled — validates participant + capability)
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.add_case_evidence(
  p_case_id  uuid,
  p_phase    text,
  p_file_url text,
  p_file_name text DEFAULT NULL,
  p_file_size int DEFAULT NULL,
  p_mime_type text DEFAULT NULL,
  p_caption   text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id   uuid := auth.uid();
  v_case       record;
  v_evidence_id uuid;
BEGIN
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_phase NOT IN ('before', 'during', 'after') THEN
    RAISE EXCEPTION 'Invalid phase: must be before/during/after';
  END IF;
  IF p_file_url IS NULL OR trim(p_file_url) = '' THEN
    RAISE EXCEPTION 'file_url is required';
  END IF;

  SELECT id, warehouse_id, status INTO v_case FROM public.cases WHERE id = p_case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Case % not found', p_case_id; END IF;

  IF NOT public.has_capability(v_case.warehouse_id, 'evidence.upload') THEN
    RAISE EXCEPTION 'Permission denied: missing evidence.upload capability';
  END IF;

  IF NOT (public.is_case_participant(p_case_id) OR public.has_capability(v_case.warehouse_id, 'case.view_all')) THEN
    RAISE EXCEPTION 'Permission denied: not a case participant';
  END IF;

  IF v_case.status = 'closed' THEN
    RAISE EXCEPTION 'Cannot add evidence to a closed case';
  END IF;

  INSERT INTO public.case_evidences (case_id, uploader_id, phase, file_url, file_name, file_size, mime_type, caption)
  VALUES (p_case_id, v_actor_id, p_phase, p_file_url, p_file_name, p_file_size, p_mime_type, p_caption)
  RETURNING id INTO v_evidence_id;

  PERFORM public.log_case_activity(p_case_id, 'evidence_added', NULL, NULL,
    jsonb_build_object('evidence_id', v_evidence_id, 'phase', p_phase));

  RETURN v_evidence_id;
END;
$$;

REVOKE ALL ON FUNCTION public.add_case_evidence(uuid,text,text,text,int,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_case_evidence(uuid,text,text,text,int,text,text) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- mark_notifications_read
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_notification_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
     SET is_read = true, read_at = now()
   WHERE id = ANY(p_notification_ids)
     AND recipient_id = auth.uid()  -- never trust caller to specify recipient
     AND is_read = false;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_notifications_read(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: 022_profile_directory.sql
-- ═══════════════════════════════════════════════════════════════════════════

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


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: 023_idempotency_and_status_fix.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 023_idempotency_and_status_fix.sql
-- Two changes:
--
-- A. Add client_request_id to cases for offline idempotency.
-- B. Fix case status transition graph:
--    - Remove: on_progress → closed (non-standard direct close)
--    - Keep standard flow only
--    - Add force_close_case() RPC for emergency admin close

-- ═══════════════════════════════════════════════════════════════════════════
-- A. IDEMPOTENCY: client_request_id column on cases
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Generated by the client when a draft is first created in IndexedDB.
-- Survives reconnect retries / sync queue re-executions.
-- UNIQUE(reporter_id, client_request_id) prevents duplicate case creation.
--
-- If create_case() is called with the same client_request_id by the same
-- authenticated user, it returns the already-created case_id without:
--   - generating a new case number
--   - inserting duplicate activity log
--   - sending duplicate notifications
--
-- The column is optional (NULL) for cases created via the web UI
-- without offline draft mode.

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS client_request_id uuid;

-- Unique constraint: same reporter + same client_request_id = same case
CREATE UNIQUE INDEX IF NOT EXISTS cases_idempotency_uq
  ON public.cases (reporter_id, client_request_id)
  WHERE client_request_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- B. STATUS TRANSITION: fix the trigger in 018
--    Replace the existing trg_case_status_transition function
--    to remove on_progress → closed from the standard graph.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Standard resolution flow:
--   open → on_progress → [waiting_repair →] waiting_verification → closed
--
-- Verification rejection:
--   waiting_verification → on_progress
--
-- Reopening:
--   closed → reopened → on_progress | waiting_repair | waiting_verification
--
-- Emergency close (admin only) via force_close_case() RPC:
--   any non-closed status → closed  (bypasses trigger via SECURITY DEFINER)
--
-- The trigger below enforces the STANDARD flow for all non-RPC direct writes.
-- force_close_case() sets a session variable to temporarily bypass.

CREATE OR REPLACE FUNCTION public.trg_case_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed_next text[];
  v_force_close  text;
BEGIN
  -- Skip if status hasn't changed
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- Allow force_close bypass: set by force_close_case() RPC only
  v_force_close := current_setting('wact.force_close', true);
  IF v_force_close = 'true' THEN
    -- Force close is only allowed to → 'closed'
    IF NEW.status = 'closed' THEN
      IF NEW.status = 'closed' AND OLD.status <> 'closed' THEN
        NEW.closed_at = now();
      END IF;
      RETURN NEW;
    ELSE
      RAISE EXCEPTION 'force_close bypass only permitted for → closed transition';
    END IF;
  END IF;

  -- Standard transition graph (no direct on_progress → closed)
  v_allowed_next := CASE OLD.status
    WHEN 'open'                 THEN ARRAY['on_progress']
    WHEN 'on_progress'          THEN ARRAY['waiting_repair', 'waiting_verification']
    WHEN 'waiting_repair'       THEN ARRAY['on_progress', 'waiting_verification']
    WHEN 'waiting_verification' THEN ARRAY['closed', 'on_progress']
    WHEN 'closed'               THEN ARRAY['reopened']
    WHEN 'reopened'             THEN ARRAY['on_progress', 'waiting_repair', 'waiting_verification']
    ELSE ARRAY[]::text[]
  END;

  IF NOT (NEW.status = ANY(v_allowed_next)) THEN
    RAISE EXCEPTION
      'Invalid case status transition: % → % (case %). Standard flow: open→on_progress→waiting_verification→closed',
      OLD.status, NEW.status, NEW.id;
  END IF;

  -- Set closed_at when closing via verification
  IF NEW.status = 'closed' AND OLD.status <> 'closed' THEN
    NEW.closed_at = now();
  END IF;

  -- Clear closed_at when reopening
  IF NEW.status = 'reopened' AND OLD.status = 'closed' THEN
    NEW.closed_at = NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- C. force_close_case() RPC — emergency admin close
-- ═══════════════════════════════════════════════════════════════════════════
-- Requires: case.force_close capability (admin-only)
-- Mandatory: reason (NOT NULL)
-- Multi-step: set bypass → update status → clear bypass → log → notify

CREATE OR REPLACE FUNCTION public.force_close_case(
  p_case_id uuid,
  p_reason  text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id  uuid := auth.uid();
  v_case      record;
  v_assignee  uuid;
BEGIN
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Reason is mandatory for force_close_case()';
  END IF;

  SELECT id, warehouse_id, status, reporter_id INTO v_case FROM public.cases WHERE id = p_case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Case % not found', p_case_id; END IF;

  -- Requires dedicated force_close capability (admin only)
  IF NOT public.has_capability(v_case.warehouse_id, 'case.force_close') THEN
    RAISE EXCEPTION 'Permission denied: missing case.force_close capability';
  END IF;

  IF v_case.status = 'closed' THEN
    RAISE EXCEPTION 'Case is already closed';
  END IF;

  -- Set bypass session variable so trigger allows the transition
  PERFORM set_config('wact.force_close', 'true', true);  -- local = true (txn-scoped)

  -- Force close
  UPDATE public.cases
     SET status = 'closed', closed_at = now()
   WHERE id = p_case_id;

  -- Clear bypass (already txn-scoped, but explicit for clarity)
  PERFORM set_config('wact.force_close', 'false', true);

  -- Audit log
  PERFORM public.log_case_activity(p_case_id, 'force_closed',
    v_case.status, 'closed',
    jsonb_build_object(
      'reason',   p_reason,
      'actor_id', v_actor_id,
      'previous_status', v_case.status
    ));

  -- Notify reporter
  PERFORM public.send_notification(v_case.reporter_id, 'force_closed',
    'Case ditutup paksa oleh admin',
    p_reason,
    jsonb_build_object('case_id', p_case_id));

  -- Notify assignee if exists
  SELECT assignee_id INTO v_assignee
    FROM public.case_assignments
   WHERE case_id = p_case_id AND is_current = true;
  IF v_assignee IS NOT NULL AND v_assignee <> v_case.reporter_id THEN
    PERFORM public.send_notification(v_assignee, 'force_closed',
      'Case ditutup paksa oleh admin', p_reason,
      jsonb_build_object('case_id', p_case_id));
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.force_close_case(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.force_close_case(uuid, text) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- D. UPDATE create_case() to be idempotent via client_request_id
-- ═══════════════════════════════════════════════════════════════════════════
-- Replaces the create_case from migration 021.
-- Same signature + new parameter: p_client_request_id uuid DEFAULT NULL

CREATE OR REPLACE FUNCTION public.create_case(
  p_warehouse_id           uuid,
  p_title                  text,
  p_description            text DEFAULT NULL,
  p_category_id            uuid DEFAULT NULL,
  p_subcategory_id         uuid DEFAULT NULL,
  p_area_id                uuid DEFAULT NULL,
  p_location_id            uuid DEFAULT NULL,
  p_asset_id               uuid DEFAULT NULL,
  p_inspection_id          uuid DEFAULT NULL,
  p_priority               text DEFAULT 'medium',
  p_has_operational_impact boolean DEFAULT false,
  p_requires_maintenance   boolean DEFAULT false,
  p_source                 text DEFAULT 'direct',
  p_due_date               timestamptz DEFAULT NULL,
  -- Offline idempotency: generated by client when draft is first created.
  -- Same reporter + same client_request_id → returns existing case, no duplicate.
  p_client_request_id      uuid DEFAULT NULL
)
RETURNS uuid   -- returns case id (new or existing)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id     uuid := auth.uid();
  v_case_id      uuid;
  v_case_number  text;
  v_wh_code      text;
  v_wh_tz        text;
  v_seq          int;
  v_display_date text;
  v_local_date   date;
BEGIN
  -- 1. Validate actor
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. IDEMPOTENCY CHECK — if client_request_id already used by this reporter,
  --    return the existing case_id immediately without any side-effects.
  IF p_client_request_id IS NOT NULL THEN
    SELECT id INTO v_case_id
      FROM public.cases
     WHERE reporter_id = v_actor_id
       AND client_request_id = p_client_request_id;

    IF FOUND THEN
      -- Already created — idempotent return, no new sequence/activity/notification
      RETURN v_case_id;
    END IF;
  END IF;

  -- 3. Validate capability
  IF NOT public.has_capability(p_warehouse_id, 'case.create') THEN
    RAISE EXCEPTION 'Permission denied: missing case.create capability in warehouse %', p_warehouse_id;
  END IF;

  -- 4. Validate warehouse is active
  SELECT code, timezone INTO v_wh_code, v_wh_tz
    FROM public.warehouses
   WHERE id = p_warehouse_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Warehouse % not found or inactive', p_warehouse_id;
  END IF;

  -- 5. Validate priority
  IF p_priority NOT IN ('low', 'medium', 'high', 'critical') THEN
    RAISE EXCEPTION 'Invalid priority: %', p_priority;
  END IF;

  -- 6. Validate source
  IF p_source NOT IN ('direct', 'inspection') THEN
    RAISE EXCEPTION 'Invalid source: %', p_source;
  END IF;

  -- 7. Validate subcategory → category
  IF p_subcategory_id IS NOT NULL AND p_category_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.case_subcategories
       WHERE id = p_subcategory_id AND category_id = p_category_id
    ) THEN
      RAISE EXCEPTION 'Subcategory % does not belong to category %', p_subcategory_id, p_category_id;
    END IF;
  END IF;

  -- 8. Validate area / location / asset / inspection belong to same warehouse
  IF p_area_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.areas WHERE id = p_area_id AND warehouse_id = p_warehouse_id) THEN
      RAISE EXCEPTION 'Area % does not belong to warehouse %', p_area_id, p_warehouse_id;
    END IF;
  END IF;
  IF p_location_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.locations WHERE id = p_location_id AND warehouse_id = p_warehouse_id) THEN
      RAISE EXCEPTION 'Location % does not belong to warehouse %', p_location_id, p_warehouse_id;
    END IF;
  END IF;
  IF p_asset_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.assets WHERE id = p_asset_id AND warehouse_id = p_warehouse_id) THEN
      RAISE EXCEPTION 'Asset % does not belong to warehouse %', p_asset_id, p_warehouse_id;
    END IF;
  END IF;
  IF p_inspection_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.inspections WHERE id = p_inspection_id AND warehouse_id = p_warehouse_id) THEN
      RAISE EXCEPTION 'Inspection % does not belong to warehouse %', p_inspection_id, p_warehouse_id;
    END IF;
  END IF;

  -- 9. Generate case number atomically (warehouse-timezone-aware)
  v_local_date   := (now() AT TIME ZONE v_wh_tz)::date;
  v_display_date := to_char(now() AT TIME ZONE v_wh_tz, 'YYMMDD');

  INSERT INTO public.case_sequences (warehouse_id, sequence_date, last_sequence)
  VALUES (p_warehouse_id, v_local_date, 1)
  ON CONFLICT (warehouse_id, sequence_date)
  DO UPDATE SET last_sequence = public.case_sequences.last_sequence + 1
  RETURNING last_sequence INTO v_seq;

  v_case_number := 'WHC-' || v_wh_code || '-' || v_display_date || '-' || lpad(v_seq::text, 3, '0');

  -- 10. Insert case (with optional client_request_id for idempotency)
  INSERT INTO public.cases (
    case_number, title, description, category_id, subcategory_id,
    warehouse_id, area_id, location_id, asset_id, inspection_id,
    reporter_id, priority, status, has_operational_impact, requires_maintenance,
    source, due_date, client_request_id
  ) VALUES (
    v_case_number, p_title, p_description, p_category_id, p_subcategory_id,
    p_warehouse_id, p_area_id, p_location_id, p_asset_id, p_inspection_id,
    v_actor_id, p_priority, 'open', p_has_operational_impact, p_requires_maintenance,
    p_source, p_due_date, p_client_request_id
  )
  RETURNING id INTO v_case_id;

  -- 11. Log creation activity
  PERFORM public.log_case_activity(v_case_id, 'created', NULL, 'open', NULL);

  RETURN v_case_id;
END;
$$;

-- Update grants for new signature (old signature remains for backward compat via overloading)
REVOKE ALL ON FUNCTION public.create_case(uuid,text,text,uuid,uuid,uuid,uuid,uuid,uuid,text,boolean,boolean,text,timestamptz,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_case(uuid,text,text,uuid,uuid,uuid,uuid,uuid,uuid,text,boolean,boolean,text,timestamptz,uuid) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: 024_seed_patch_force_close_capability.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 024_seed_patch_force_close_capability.sql
-- Add case.force_close capability to admin role only.
-- Patch to 019_seed.sql — safe to run after seed.

INSERT INTO public.role_capabilities (role_id, capability)
SELECT id, 'case.force_close'
FROM public.roles
WHERE name = 'admin'
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: 025_security_hardening.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 025_security_hardening.sql
-- Security Hardening Patch:
-- 1. Restrict internal helper EXECUTE privileges (next_case_sequence, log_case_activity, send_notification).
-- 2. Make client_request_id mandatory in create_case().
-- 3. Calculate SLA due_date internally inside create_case() (remove caller p_due_date parameter).
-- 4. Remove case.view_all as mutation bypass in update_case_progress, request_case_verification, add_case_comment, add_case_evidence.
-- 5. Clean up old create_case function overloads.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. RESTRICT INTERNAL HELPERS (REVOKE from PUBLIC and authenticated)
-- ═══════════════════════════════════════════════════════════════════════════

-- log_case_activity is an internal helper called only by mutation RPCs
REVOKE ALL ON FUNCTION public.log_case_activity(uuid, text, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_case_activity(uuid, text, text, text, jsonb) FROM authenticated;

-- send_notification is an internal helper called only by mutation RPCs
REVOKE ALL ON FUNCTION public.send_notification(uuid, text, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.send_notification(uuid, text, text, text, jsonb) FROM authenticated;

-- next_case_sequence is an internal sequence generator called only by create_case()
REVOKE ALL ON FUNCTION public.next_case_sequence(uuid, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.next_case_sequence(uuid, date) FROM authenticated;

-- Ensure RLS helpers remain executable by authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_warehouse_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_capability(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_case_participant(uuid) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2 & 3. UPDATE create_case():
--    - Mandatory p_client_request_id (no DEFAULT NULL)
--    - Internal SLA calculation (remove p_due_date parameter)
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop previous function signatures to avoid ambiguous overloads
DROP FUNCTION IF EXISTS public.create_case(uuid, text, text, uuid, uuid, uuid, uuid, uuid, uuid, text, boolean, boolean, text, timestamptz);
DROP FUNCTION IF EXISTS public.create_case(uuid, text, text, uuid, uuid, uuid, uuid, uuid, uuid, text, boolean, boolean, text, timestamptz, uuid);
DROP FUNCTION IF EXISTS public.create_case(uuid, text, text, uuid, uuid, uuid, uuid, uuid, uuid, text, boolean, boolean, text, uuid);

CREATE OR REPLACE FUNCTION public.create_case(
  p_warehouse_id           uuid,
  p_title                  text,
  p_client_request_id      uuid,   -- MANDATORY idempotency identifier (no DEFAULT NULL)
  p_description            text     DEFAULT NULL,
  p_category_id            uuid     DEFAULT NULL,
  p_subcategory_id         uuid     DEFAULT NULL,
  p_area_id                uuid     DEFAULT NULL,
  p_location_id            uuid     DEFAULT NULL,
  p_asset_id               uuid     DEFAULT NULL,
  p_inspection_id          uuid     DEFAULT NULL,
  p_priority               text     DEFAULT 'medium',
  p_has_operational_impact boolean  DEFAULT false,
  p_requires_maintenance   boolean  DEFAULT false,
  p_source                 text     DEFAULT 'direct'
)
RETURNS uuid   -- returns case id (new or existing)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id        uuid := auth.uid();
  v_case_id         uuid;
  v_case_number     text;
  v_wh_code         text;
  v_wh_tz           text;
  v_seq             int;
  v_display_date    text;
  v_local_date      date;
  v_duration_hours  numeric;
  v_due_date        timestamptz;
BEGIN
  -- 1. Validate actor is authenticated
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Validate client_request_id is provided
  IF p_client_request_id IS NULL THEN
    RAISE EXCEPTION 'client_request_id is required for idempotent case creation';
  END IF;

  -- 3. IDEMPOTENCY CHECK — if client_request_id already used by this reporter,
  --    return existing case_id without consuming sequences, logging duplicate activity, or sending duplicate notifications.
  SELECT id INTO v_case_id
    FROM public.cases
   WHERE reporter_id = v_actor_id
     AND client_request_id = p_client_request_id;

  IF FOUND THEN
    RETURN v_case_id;
  END IF;

  -- 4. Validate capability
  IF NOT public.has_capability(p_warehouse_id, 'case.create') THEN
    RAISE EXCEPTION 'Permission denied: missing case.create capability in warehouse %', p_warehouse_id;
  END IF;

  -- 5. Validate warehouse is active
  SELECT code, timezone INTO v_wh_code, v_wh_tz
    FROM public.warehouses
   WHERE id = p_warehouse_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Warehouse % not found or inactive', p_warehouse_id;
  END IF;

  -- 6. Validate priority
  IF p_priority NOT IN ('low', 'medium', 'high', 'critical') THEN
    RAISE EXCEPTION 'Invalid priority: %', p_priority;
  END IF;

  -- 7. Validate source
  IF p_source NOT IN ('direct', 'inspection') THEN
    RAISE EXCEPTION 'Invalid source: %', p_source;
  END IF;

  -- 8. Validate subcategory -> category relationship
  IF p_subcategory_id IS NOT NULL AND p_category_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.case_subcategories
       WHERE id = p_subcategory_id AND category_id = p_category_id
    ) THEN
      RAISE EXCEPTION 'Subcategory % does not belong to category %', p_subcategory_id, p_category_id;
    END IF;
  END IF;

  -- 9. Validate area / location / asset / inspection belong to same warehouse
  IF p_area_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.areas WHERE id = p_area_id AND warehouse_id = p_warehouse_id) THEN
      RAISE EXCEPTION 'Area % does not belong to warehouse %', p_area_id, p_warehouse_id;
    END IF;
  END IF;
  IF p_location_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.locations WHERE id = p_location_id AND warehouse_id = p_warehouse_id) THEN
      RAISE EXCEPTION 'Location % does not belong to warehouse %', p_location_id, p_warehouse_id;
    END IF;
  END IF;
  IF p_asset_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.assets WHERE id = p_asset_id AND warehouse_id = p_warehouse_id) THEN
      RAISE EXCEPTION 'Asset % does not belong to warehouse %', p_asset_id, p_warehouse_id;
    END IF;
  END IF;
  IF p_inspection_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.inspections WHERE id = p_inspection_id AND warehouse_id = p_warehouse_id) THEN
      RAISE EXCEPTION 'Inspection % does not belong to warehouse %', p_inspection_id, p_warehouse_id;
    END IF;
  END IF;

  -- 10. Calculate SLA due date internally
  -- First: look for active warehouse-specific SLA
  SELECT duration_hours INTO v_duration_hours
    FROM public.sla_configurations
   WHERE warehouse_id = p_warehouse_id
     AND priority = p_priority
     AND is_active = true
   LIMIT 1;

  -- Second: fallback to active global SLA
  IF v_duration_hours IS NULL THEN
    SELECT duration_hours INTO v_duration_hours
      FROM public.sla_configurations
     WHERE warehouse_id IS NULL
       AND priority = p_priority
       AND is_active = true
     LIMIT 1;
  END IF;

  -- If no SLA configured: raise clear exception
  IF v_duration_hours IS NULL THEN
    RAISE EXCEPTION 'No active SLA configuration found for priority "%" in warehouse % (or global fallback)', p_priority, p_warehouse_id;
  END IF;

  v_due_date := now() + (v_duration_hours || ' hours')::interval;

  -- 11. Generate case number atomically (warehouse-timezone-aware)
  v_local_date   := (now() AT TIME ZONE v_wh_tz)::date;
  v_display_date := to_char(now() AT TIME ZONE v_wh_tz, 'YYMMDD');

  INSERT INTO public.case_sequences (warehouse_id, sequence_date, last_sequence)
  VALUES (p_warehouse_id, v_local_date, 1)
  ON CONFLICT (warehouse_id, sequence_date)
  DO UPDATE SET last_sequence = public.case_sequences.last_sequence + 1
  RETURNING last_sequence INTO v_seq;

  v_case_number := 'WHC-' || v_wh_code || '-' || v_display_date || '-' || lpad(v_seq::text, 3, '0');

  -- 12. Insert case with mandatory client_request_id and calculated due_date
  INSERT INTO public.cases (
    case_number, title, description, category_id, subcategory_id,
    warehouse_id, area_id, location_id, asset_id, inspection_id,
    reporter_id, priority, status, has_operational_impact, requires_maintenance,
    source, due_date, client_request_id
  ) VALUES (
    v_case_number, p_title, p_description, p_category_id, p_subcategory_id,
    p_warehouse_id, p_area_id, p_location_id, p_asset_id, p_inspection_id,
    v_actor_id, p_priority, 'open', p_has_operational_impact, p_requires_maintenance,
    p_source, v_due_date, p_client_request_id
  )
  RETURNING id INTO v_case_id;

  -- 13. Log creation activity
  PERFORM public.log_case_activity(v_case_id, 'created', NULL, 'open', NULL);

  RETURN v_case_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_case(uuid, text, uuid, text, uuid, uuid, uuid, uuid, uuid, uuid, text, boolean, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_case(uuid, text, uuid, text, uuid, uuid, uuid, uuid, uuid, uuid, text, boolean, boolean, text) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. HARDEN MUTATION RPCS: REMOVE READ CAPABILITY (case.view_all) AS WRITE BYPASS
-- ═══════════════════════════════════════════════════════════════════════════

-- 4.1 update_case_progress: requires case.update_progress
CREATE OR REPLACE FUNCTION public.update_case_progress(
  p_case_id                uuid,
  p_description            text    DEFAULT NULL,
  p_corrective_action      text    DEFAULT NULL,
  p_preventive_action      text    DEFAULT NULL,
  p_root_cause_id          uuid    DEFAULT NULL,
  p_has_operational_impact boolean DEFAULT NULL,
  p_requires_maintenance   boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_case     record;
BEGIN
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT id, warehouse_id, status INTO v_case FROM public.cases WHERE id = p_case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Case % not found', p_case_id; END IF;

  -- Validate capability: MUST have case.update_progress (view_all is not a write permission)
  IF NOT public.has_capability(v_case.warehouse_id, 'case.update_progress') THEN
    RAISE EXCEPTION 'Permission denied: missing case.update_progress capability';
  END IF;

  -- Must be a participant (reporter or current assignee) or hold coordinator/admin roles that manage warehouse cases
  IF NOT (
    public.is_case_participant(p_case_id)
    OR public.has_capability(v_case.warehouse_id, 'case.assign')
  ) THEN
    RAISE EXCEPTION 'Permission denied: not assigned to this case';
  END IF;

  -- Cannot update a closed case
  IF v_case.status = 'closed' THEN
    RAISE EXCEPTION 'Cannot update a closed case. Use reopen_case first.';
  END IF;

  -- Apply only non-null fields
  UPDATE public.cases SET
    description            = COALESCE(p_description, description),
    corrective_action      = COALESCE(p_corrective_action, corrective_action),
    preventive_action      = COALESCE(p_preventive_action, preventive_action),
    root_cause_id          = COALESCE(p_root_cause_id, root_cause_id),
    has_operational_impact = COALESCE(p_has_operational_impact, has_operational_impact),
    requires_maintenance   = COALESCE(p_requires_maintenance, requires_maintenance)
  WHERE id = p_case_id;

  PERFORM public.log_case_activity(p_case_id, 'maintenance_updated', NULL, NULL,
    jsonb_build_object('actor_id', v_actor_id));
END;
$$;

REVOKE ALL ON FUNCTION public.update_case_progress(uuid, text, text, text, uuid, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_case_progress(uuid, text, text, text, uuid, boolean, boolean) TO authenticated;

-- 4.2 request_case_verification: requires case.request_verification & participant
CREATE OR REPLACE FUNCTION public.request_case_verification(p_case_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_case     record;
BEGIN
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT id, warehouse_id, status INTO v_case FROM public.cases WHERE id = p_case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Case % not found', p_case_id; END IF;

  IF NOT public.has_capability(v_case.warehouse_id, 'case.request_verification') THEN
    RAISE EXCEPTION 'Permission denied: missing case.request_verification capability';
  END IF;

  -- Must be assigned to case or hold case assignment management capability
  IF NOT (
    public.is_case_participant(p_case_id)
    OR public.has_capability(v_case.warehouse_id, 'case.assign')
  ) THEN
    RAISE EXCEPTION 'Permission denied: not a case participant';
  END IF;

  IF v_case.status NOT IN ('on_progress', 'waiting_repair') THEN
    RAISE EXCEPTION 'Can only request verification from on_progress or waiting_repair (current: %)', v_case.status;
  END IF;

  UPDATE public.cases SET status = 'waiting_verification' WHERE id = p_case_id;

  PERFORM public.log_case_activity(p_case_id, 'status_changed',
    v_case.status, 'waiting_verification', NULL);

  -- Notify warehouse verifiers (those with case.verify capability)
  INSERT INTO public.notifications (recipient_id, type, title, data)
  SELECT uw.user_id, 'waiting_verification',
         'Case menunggu verifikasi',
         jsonb_build_object('case_id', p_case_id)
  FROM public.user_warehouses uw
  JOIN public.role_capabilities rc ON rc.role_id = uw.role_id
  WHERE uw.warehouse_id = v_case.warehouse_id
    AND uw.is_active    = true
    AND rc.capability   = 'case.verify'
    AND uw.user_id     <> v_actor_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_case_verification(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_case_verification(uuid) TO authenticated;

-- 4.3 add_case_comment: requires participant or case management capability
CREATE OR REPLACE FUNCTION public.add_case_comment(
  p_case_id     uuid,
  p_content     text,
  p_is_internal boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id   uuid := auth.uid();
  v_case       record;
  v_comment_id uuid;
BEGIN
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_content IS NULL OR trim(p_content) = '' THEN
    RAISE EXCEPTION 'Comment content cannot be empty';
  END IF;

  SELECT id, warehouse_id, status INTO v_case FROM public.cases WHERE id = p_case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Case % not found', p_case_id; END IF;

  -- Must be case participant or hold active management capabilities in this warehouse
  IF NOT (
    public.is_case_participant(p_case_id)
    OR public.has_capability(v_case.warehouse_id, 'case.assign')
    OR public.has_capability(v_case.warehouse_id, 'case.verify')
    OR public.has_capability(v_case.warehouse_id, 'case.update_progress')
  ) THEN
    RAISE EXCEPTION 'Permission denied: not a case participant or authorized manager';
  END IF;

  IF v_case.status = 'closed' THEN
    RAISE EXCEPTION 'Cannot comment on a closed case';
  END IF;

  INSERT INTO public.case_comments (case_id, author_id, content, is_internal)
  VALUES (p_case_id, v_actor_id, p_content, p_is_internal)
  RETURNING id INTO v_comment_id;

  PERFORM public.log_case_activity(p_case_id, 'commented', NULL, NULL,
    jsonb_build_object('comment_id', v_comment_id, 'is_internal', p_is_internal));

  RETURN v_comment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.add_case_comment(uuid, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_case_comment(uuid, text, boolean) TO authenticated;

-- 4.4 add_case_evidence: requires evidence.upload AND participant/management capability
CREATE OR REPLACE FUNCTION public.add_case_evidence(
  p_case_id   uuid,
  p_phase     text,
  p_file_url  text,
  p_file_name text DEFAULT NULL,
  p_file_size int DEFAULT NULL,
  p_mime_type text DEFAULT NULL,
  p_caption   text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id    uuid := auth.uid();
  v_case        record;
  v_evidence_id uuid;
BEGIN
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_phase NOT IN ('before', 'during', 'after') THEN
    RAISE EXCEPTION 'Invalid phase: must be before/during/after';
  END IF;
  IF p_file_url IS NULL OR trim(p_file_url) = '' THEN
    RAISE EXCEPTION 'file_url is required';
  END IF;

  SELECT id, warehouse_id, status INTO v_case FROM public.cases WHERE id = p_case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Case % not found', p_case_id; END IF;

  IF NOT public.has_capability(v_case.warehouse_id, 'evidence.upload') THEN
    RAISE EXCEPTION 'Permission denied: missing evidence.upload capability';
  END IF;

  -- Must be case participant or hold active management capabilities
  IF NOT (
    public.is_case_participant(p_case_id)
    OR public.has_capability(v_case.warehouse_id, 'case.assign')
    OR public.has_capability(v_case.warehouse_id, 'case.verify')
    OR public.has_capability(v_case.warehouse_id, 'case.update_progress')
  ) THEN
    RAISE EXCEPTION 'Permission denied: not authorized to add evidence to this case';
  END IF;

  IF v_case.status = 'closed' THEN
    RAISE EXCEPTION 'Cannot add evidence to a closed case';
  END IF;

  INSERT INTO public.case_evidences (case_id, uploader_id, phase, file_url, file_name, file_size, mime_type, caption)
  VALUES (p_case_id, v_actor_id, p_phase, p_file_url, p_file_name, p_file_size, p_mime_type, p_caption)
  RETURNING id INTO v_evidence_id;

  PERFORM public.log_case_activity(p_case_id, 'evidence_added', NULL, NULL,
    jsonb_build_object('evidence_id', v_evidence_id, 'phase', p_phase));

  RETURN v_evidence_id;
END;
$$;

REVOKE ALL ON FUNCTION public.add_case_evidence(uuid, text, text, text, int, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_case_evidence(uuid, text, text, text, int, text, text) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: 026_grants_alignment.sql
-- ═══════════════════════════════════════════════════════════════════════════

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


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: 027_fix_rls_recursion.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 027_fix_rls_recursion.sql
-- Fix mutual RLS recursion between `cases` and `case_assignments`.
--
-- Cause of Error (42P17):
-- `cases_select` queried `case_assignments` table directly (SECURITY INVOKER),
-- which triggered `case_assign_select`, which queried `cases` table directly,
-- causing infinite recursion.
--
-- Solution:
-- Use STABLE SECURITY DEFINER helper functions for cross-table ownership checks:
-- 1. `is_case_assignee(case_id, user_id)` — used by `cases_select` policy
-- 2. `can_view_case_assignment(case_id, assignee_id, assigned_by)` — used by `case_assign_select` policy
--
-- Because both helpers run with SECURITY DEFINER, table queries inside them
-- bypass RLS evaluation for that lookup, preventing any recursion cycles.

-- ── 1. Helper Functions (SECURITY DEFINER) ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_case_assignee(p_case_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.case_assignments
    WHERE case_id = p_case_id
      AND assignee_id = p_user_id
      AND is_current = true
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_case_assignment(
  p_case_id     uuid,
  p_assignee_id uuid,
  p_assigned_by uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    p_assignee_id = auth.uid()
    OR p_assigned_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = p_case_id
        AND c.warehouse_id = ANY(public.get_user_warehouse_ids())
        AND (
          public.has_capability(c.warehouse_id, 'case.view_all')
          OR c.reporter_id = auth.uid()
        )
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_case_assignee(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_case_assignment(uuid, uuid, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_case_assignee(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_view_case_assignment(uuid, uuid, uuid) FROM PUBLIC, anon;

-- ── 2. Re-create cases_select Policy (Zero Recursion) ─────────────────────

DROP POLICY IF EXISTS cases_select ON public.cases;

CREATE POLICY cases_select ON public.cases FOR SELECT USING (
  warehouse_id = ANY(public.get_user_warehouse_ids())
  AND (
    public.has_capability(warehouse_id, 'case.view_all')
    OR (
      public.has_capability(warehouse_id, 'case.view_assigned')
      AND (
        reporter_id = auth.uid()
        OR public.is_case_assignee(id, auth.uid())
      )
    )
    OR (
      public.has_capability(warehouse_id, 'case.view_own')
      AND reporter_id = auth.uid()
    )
  )
);

-- ── 3. Re-create case_assign_select Policy (Zero Recursion) ────────────────

DROP POLICY IF EXISTS case_assign_select ON public.case_assignments;

CREATE POLICY case_assign_select ON public.case_assignments FOR SELECT USING (
  public.can_view_case_assignment(case_id, assignee_id, assigned_by)
);


COMMIT;
