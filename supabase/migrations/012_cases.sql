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

