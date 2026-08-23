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
