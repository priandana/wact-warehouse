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
