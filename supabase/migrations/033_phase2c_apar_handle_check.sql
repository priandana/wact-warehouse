-- 033_phase2c_apar_handle_check.sql
-- Phase 2C: Add missing APAR checklist item (Kondisi Handle / Tuas Pengungkit)
-- Fully idempotent with deterministic UUID: 00000000-0000-0000-0007-000000002203
-- Includes fail-fast parent section and template integrity validation.

BEGIN;

DO $$
DECLARE
  v_target_section_id  uuid := '00000000-0000-0000-0007-000000000202';
  v_expected_tpl_id    uuid := '00000000-0000-0000-0007-000000000002';
  v_actual_tpl_id      uuid;
  v_tpl_is_active      boolean;
  v_cat_name           text;
BEGIN
  -- 1. Validate target section exists and points to expected template
  SELECT s.template_id, t.is_active, c.name
    INTO v_actual_tpl_id, v_tpl_is_active, v_cat_name
    FROM public.inspection_template_sections s
    JOIN public.inspection_templates t ON t.id = s.template_id
    LEFT JOIN public.asset_categories c ON c.id = t.category_id
   WHERE s.id = v_target_section_id;

  IF v_actual_tpl_id IS NULL THEN
    RAISE EXCEPTION 'Parent section % does not exist in inspection_template_sections', v_target_section_id;
  END IF;

  IF v_actual_tpl_id <> v_expected_tpl_id THEN
    RAISE EXCEPTION 'Parent section % belongs to template %, expected %', v_target_section_id, v_actual_tpl_id, v_expected_tpl_id;
  END IF;

  IF v_tpl_is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Parent template % is not active', v_expected_tpl_id;
  END IF;

  IF v_cat_name IS DISTINCT FROM 'APAR' THEN
    RAISE EXCEPTION 'Parent template % category is %, expected APAR', v_expected_tpl_id, v_cat_name;
  END IF;

  -- 2. Upsert the APAR handle checklist item
  INSERT INTO public.inspection_template_items (
    id,
    section_id,
    label,
    description,
    is_required,
    sort_order
  ) VALUES (
    '00000000-0000-0000-0007-000000002203',
    v_target_section_id,
    'Kondisi Handle / Tuas Pengungkit',
    'Handle kokoh, tuas pengungkit tidak macet, bengkok, atau berkarat, dan siap dioperasikan.',
    true,
    3
  )
  ON CONFLICT (id) DO UPDATE SET
    section_id = EXCLUDED.section_id,
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    is_required = EXCLUDED.is_required,
    sort_order = EXCLUDED.sort_order;

END $$;

COMMIT;
