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
