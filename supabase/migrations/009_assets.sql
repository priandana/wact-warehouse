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
