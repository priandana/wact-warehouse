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
