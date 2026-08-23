-- 031_phase2c_inspection_rpcs.sql
-- Phase 2C: QC & Inspection Workflow Database Foundation
-- 1. inspection_sequences table for atomic sequence number generation (internal least-privilege)
-- 2. inspection_interval_days column on inspection_templates (nullable)
-- 3. UNIQUE (inspection_id, item_id) constraint on inspection_results for safe upsert
-- 4. Partial unique index for one active draft inspection per asset
-- 5. Hardened SECURITY DEFINER RPCs for inspection lifecycle and global template management

-- ── 1. inspection_sequences table (Internal Least-Privilege) ────────────────

CREATE TABLE IF NOT EXISTS public.inspection_sequences (
  warehouse_id  uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  sequence_date date NOT NULL,
  last_sequence int NOT NULL DEFAULT 0,
  PRIMARY KEY (warehouse_id, sequence_date)
);

ALTER TABLE public.inspection_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS insp_seq_select ON public.inspection_sequences;
DROP POLICY IF EXISTS insp_seq_insert ON public.inspection_sequences;
DROP POLICY IF EXISTS insp_seq_update ON public.inspection_sequences;
DROP POLICY IF EXISTS insp_seq_delete ON public.inspection_sequences;

CREATE POLICY insp_seq_select ON public.inspection_sequences FOR SELECT USING (false);
CREATE POLICY insp_seq_insert ON public.inspection_sequences FOR INSERT WITH CHECK (false);
CREATE POLICY insp_seq_update ON public.inspection_sequences FOR UPDATE USING (false);
CREATE POLICY insp_seq_delete ON public.inspection_sequences FOR DELETE USING (false);

-- Direct client access revoked; table is mutated solely by start_inspection() RPC
REVOKE ALL ON public.inspection_sequences FROM PUBLIC, authenticated;

-- ── 2. Add inspection_interval_days to inspection_templates ────────────────

ALTER TABLE public.inspection_templates
  ADD COLUMN IF NOT EXISTS inspection_interval_days integer CHECK (inspection_interval_days > 0);

-- ── 3. UNIQUE (inspection_id, item_id) on inspection_results ───────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_results_insp_item' AND conrelid = 'public.inspection_results'::regclass
  ) THEN
    ALTER TABLE public.inspection_results
      ADD CONSTRAINT uq_results_insp_item UNIQUE (inspection_id, item_id);
  END IF;
END $$;

-- ── 4. One active draft inspection per asset ───────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS uq_inspections_asset_draft
  ON public.inspections (asset_id)
  WHERE status = 'draft';

-- ── 5. RPC: start_inspection ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.start_inspection(
  p_warehouse_id uuid,
  p_asset_id     uuid,
  p_template_id  uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id          uuid := auth.uid();
  v_wh_code           text;
  v_wh_tz             text;
  v_asset_status      text;
  v_asset_category_id uuid;
  v_tpl_category_id   uuid;
  v_local_date        date;
  v_display_date      text;
  v_seq               int;
  v_insp_number       text;
  v_inspection_id     uuid;
BEGIN
  -- 1. Validate actor is authenticated
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Validate actor's warehouse scope & capability
  IF NOT (p_warehouse_id = ANY(public.get_user_warehouse_ids())) THEN
    RAISE EXCEPTION 'Permission denied: warehouse % is not in your active scope', p_warehouse_id;
  END IF;

  IF NOT public.has_capability(p_warehouse_id, 'inspection.start') THEN
    RAISE EXCEPTION 'Permission denied: missing inspection.start capability in warehouse %', p_warehouse_id;
  END IF;

  -- 3. Validate warehouse is active & get timezone/code
  SELECT code, timezone INTO v_wh_code, v_wh_tz
    FROM public.warehouses
   WHERE id = p_warehouse_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Warehouse % not found or inactive', p_warehouse_id;
  END IF;

  -- 4. Validate asset belongs to warehouse, read category, and ensure not retired
  SELECT status, category_id
    INTO v_asset_status, v_asset_category_id
    FROM public.assets
   WHERE id = p_asset_id AND warehouse_id = p_warehouse_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Asset % does not belong to warehouse %', p_asset_id, p_warehouse_id;
  END IF;
  IF v_asset_status = 'retired' THEN
    RAISE EXCEPTION 'Asset % is retired and cannot be inspected', p_asset_id;
  END IF;

  -- 5. Validate template exists, is active, and matches asset category
  SELECT category_id
    INTO v_tpl_category_id
    FROM public.inspection_templates
   WHERE id = p_template_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inspection template % not found or inactive', p_template_id;
  END IF;

  -- Category-specific templates must match asset category; generic templates (category_id IS NULL) are allowed
  IF v_tpl_category_id IS NOT NULL AND v_tpl_category_id IS DISTINCT FROM v_asset_category_id THEN
    RAISE EXCEPTION 'Template category does not match asset category';
  END IF;

  -- 6. Guard against active draft for same asset
  IF EXISTS (
    SELECT 1 FROM public.inspections
     WHERE asset_id = p_asset_id AND status = 'draft'
  ) THEN
    RAISE EXCEPTION 'Asset % already has an active draft inspection. Complete or cancel it first.', p_asset_id;
  END IF;

  -- 7. Generate inspection number atomically (warehouse timezone aware)
  v_local_date   := (now() AT TIME ZONE v_wh_tz)::date;
  v_display_date := to_char(now() AT TIME ZONE v_wh_tz, 'YYMMDD');

  INSERT INTO public.inspection_sequences (warehouse_id, sequence_date, last_sequence)
  VALUES (p_warehouse_id, v_local_date, 1)
  ON CONFLICT (warehouse_id, sequence_date)
  DO UPDATE SET last_sequence = public.inspection_sequences.last_sequence + 1
  RETURNING last_sequence INTO v_seq;

  v_insp_number := 'INSP-' || v_wh_code || '-' || v_display_date || '-' || lpad(v_seq::text, 3, '0');

  -- 8. Insert inspection record
  INSERT INTO public.inspections (
    inspection_number, asset_id, warehouse_id, template_id,
    inspector_id, status, started_at
  ) VALUES (
    v_insp_number, p_asset_id, p_warehouse_id, p_template_id,
    v_actor_id, 'draft', now()
  )
  RETURNING id INTO v_inspection_id;

  RETURN v_inspection_id;
END;
$$;

REVOKE ALL ON FUNCTION public.start_inspection(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_inspection(uuid, uuid, uuid) TO authenticated;

-- ── 6. RPC: submit_inspection_result ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.submit_inspection_result(
  p_inspection_id uuid,
  p_item_id       uuid,
  p_value         text,
  p_notes         text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id           uuid := auth.uid();
  v_insp_inspector_id  uuid;
  v_insp_template_id   uuid;
  v_insp_warehouse_id  uuid;
  v_insp_status        text;
  v_result_id          uuid;
BEGIN
  -- 1. Validate actor is authenticated
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Validate value is ok, ng, or na
  IF p_value NOT IN ('ok', 'ng', 'na') THEN
    RAISE EXCEPTION 'Invalid result value: %. Must be ok, ng, or na', p_value;
  END IF;

  -- 3. Validate inspection exists, is draft, and actor is the assigned inspector
  SELECT inspector_id, template_id, warehouse_id, status
    INTO v_insp_inspector_id, v_insp_template_id, v_insp_warehouse_id, v_insp_status
    FROM public.inspections
   WHERE id = p_inspection_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inspection % not found', p_inspection_id;
  END IF;
  IF v_insp_status != 'draft' THEN
    RAISE EXCEPTION 'Inspection % is not in draft status (current: %)', p_inspection_id, v_insp_status;
  END IF;
  IF v_insp_inspector_id != v_actor_id THEN
    RAISE EXCEPTION 'Permission denied: only the inspector who started this inspection can submit results';
  END IF;

  -- 4. Revalidate actor's current warehouse scope and inspection capability
  IF NOT (v_insp_warehouse_id = ANY(public.get_user_warehouse_ids())) THEN
    RAISE EXCEPTION 'Permission denied: inspection warehouse is no longer in your active scope';
  END IF;
  IF NOT public.has_capability(v_insp_warehouse_id, 'inspection.start') THEN
    RAISE EXCEPTION 'Permission denied: missing inspection.start capability in warehouse %', v_insp_warehouse_id;
  END IF;

  -- 5. Cross-template item injection prevention: verify item belongs to this template
  IF NOT EXISTS (
    SELECT 1
      FROM public.inspection_template_items iti
      JOIN public.inspection_template_sections its ON its.id = iti.section_id
     WHERE iti.id = p_item_id
       AND its.template_id = v_insp_template_id
  ) THEN
    RAISE EXCEPTION 'Item % does not belong to the template of inspection %', p_item_id, p_inspection_id;
  END IF;

  -- 6. Upsert result
  INSERT INTO public.inspection_results (
    inspection_id, item_id, value, notes, created_at
  ) VALUES (
    p_inspection_id, p_item_id, p_value, p_notes, now()
  )
  ON CONFLICT (inspection_id, item_id)
  DO UPDATE SET
    value = EXCLUDED.value,
    notes = EXCLUDED.notes
  RETURNING id INTO v_result_id;

  RETURN v_result_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_inspection_result(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_inspection_result(uuid, uuid, text, text) TO authenticated;

-- ── 7. RPC: complete_inspection ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.complete_inspection(
  p_inspection_id uuid,
  p_notes         text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id         uuid := auth.uid();
  v_asset_id         uuid;
  v_template_id      uuid;
  v_inspector_id     uuid;
  v_warehouse_id     uuid;
  v_status           text;
  v_missing_count    int;
  v_missing_labels   text;
  v_ng_count         int;
  v_ok_count         int;
  v_na_count         int;
  v_overall          text;
  v_interval_days    int;
BEGIN
  -- 1. Validate actor is authenticated
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Validate inspection exists, is draft, and actor is the assigned inspector
  SELECT asset_id, template_id, inspector_id, warehouse_id, status
    INTO v_asset_id, v_template_id, v_inspector_id, v_warehouse_id, v_status
    FROM public.inspections
   WHERE id = p_inspection_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inspection % not found', p_inspection_id;
  END IF;
  IF v_status != 'draft' THEN
    RAISE EXCEPTION 'Inspection % is not in draft status (current: %)', p_inspection_id, v_status;
  END IF;
  IF v_inspector_id != v_actor_id THEN
    RAISE EXCEPTION 'Permission denied: only the inspector who started this inspection can complete it';
  END IF;

  -- 3. Revalidate actor's current warehouse scope and inspection capability
  IF NOT (v_warehouse_id = ANY(public.get_user_warehouse_ids())) THEN
    RAISE EXCEPTION 'Permission denied: inspection warehouse is no longer in your active scope';
  END IF;
  IF NOT public.has_capability(v_warehouse_id, 'inspection.start') THEN
    RAISE EXCEPTION 'Permission denied: missing inspection.start capability in warehouse %', v_warehouse_id;
  END IF;

  -- 4. Check all required items are answered (submitted ok, ng, or na)
  SELECT count(*), string_agg(iti.label, ', ')
    INTO v_missing_count, v_missing_labels
    FROM public.inspection_template_items iti
    JOIN public.inspection_template_sections its ON its.id = iti.section_id
    LEFT JOIN public.inspection_results ir
           ON ir.inspection_id = p_inspection_id AND ir.item_id = iti.id
   WHERE its.template_id = v_template_id
     AND iti.is_required = true
     AND (ir.id IS NULL OR ir.value IS NULL);

  IF v_missing_count > 0 THEN
    RAISE EXCEPTION 'Cannot complete inspection: % required item(s) not answered: %', v_missing_count, v_missing_labels;
  END IF;

  -- 5. Derive overall_result server-side: NG > OK > NA
  SELECT
    COUNT(*) FILTER (WHERE value = 'ng'),
    COUNT(*) FILTER (WHERE value = 'ok'),
    COUNT(*) FILTER (WHERE value = 'na')
  INTO v_ng_count, v_ok_count, v_na_count
  FROM public.inspection_results
  WHERE inspection_id = p_inspection_id;

  IF v_ng_count > 0 THEN
    v_overall := 'ng';
  ELSIF v_ok_count > 0 THEN
    v_overall := 'ok';
  ELSIF v_na_count > 0 THEN
    v_overall := 'na';
  ELSE
    v_overall := 'ok';
  END IF;

  -- 6. Update inspection record
  UPDATE public.inspections
     SET status = 'completed',
         overall_result = v_overall,
         notes = COALESCE(p_notes, notes),
         completed_at = now()
   WHERE id = p_inspection_id;

  -- 7. Safely update asset inspection timestamps (SECURITY DEFINER bypasses asset.manage RLS)
  SELECT inspection_interval_days INTO v_interval_days
    FROM public.inspection_templates
   WHERE id = v_template_id;

  IF v_interval_days IS NOT NULL AND v_interval_days > 0 THEN
    UPDATE public.assets
       SET last_inspection_at = now(),
           next_inspection_at = now() + (v_interval_days || ' days')::interval
     WHERE id = v_asset_id;
  ELSE
    UPDATE public.assets
       SET last_inspection_at = now(),
           next_inspection_at = NULL
     WHERE id = v_asset_id;
  END IF;

  RETURN v_overall;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_inspection(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_inspection(uuid, text) TO authenticated;

-- ── 8. RPC: cancel_inspection ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.cancel_inspection(
  p_inspection_id uuid,
  p_reason        text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id      uuid := auth.uid();
  v_inspector_id  uuid;
  v_warehouse_id  uuid;
  v_status        text;
  v_notes         text;
BEGIN
  -- 1. Validate actor is authenticated
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Validate cancellation reason is mandatory
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Cancellation reason is mandatory';
  END IF;

  -- 3. Validate inspection exists and is draft
  SELECT inspector_id, warehouse_id, status, notes
    INTO v_inspector_id, v_warehouse_id, v_status, v_notes
    FROM public.inspections
   WHERE id = p_inspection_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inspection % not found', p_inspection_id;
  END IF;
  IF v_status != 'draft' THEN
    RAISE EXCEPTION 'Cannot cancel inspection in % status (must be draft)', v_status;
  END IF;

  -- 4. Validate actor's current warehouse scope and cancellation capability
  IF (SELECT is_super_admin FROM public.profiles WHERE id = v_actor_id) THEN
    -- Super Admin always authorized
    NULL;
  ELSIF v_inspector_id = v_actor_id THEN
    -- Inspector cancelling own draft: must still be in warehouse scope and have inspection.start capability
    IF NOT (v_warehouse_id = ANY(public.get_user_warehouse_ids())) THEN
      RAISE EXCEPTION 'Permission denied: inspection warehouse is no longer in your active scope';
    END IF;
    IF NOT public.has_capability(v_warehouse_id, 'inspection.start') THEN
      RAISE EXCEPTION 'Permission denied: missing inspection.start capability in warehouse %', v_warehouse_id;
    END IF;
  ELSIF public.has_capability(v_warehouse_id, 'case.assign') THEN
    -- Coordinator cancelling draft in their warehouse: must be in active warehouse scope
    IF NOT (v_warehouse_id = ANY(public.get_user_warehouse_ids())) THEN
      RAISE EXCEPTION 'Permission denied: warehouse % is not in your active scope', v_warehouse_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Permission denied: only the inspector or a coordinator/admin can cancel this inspection';
  END IF;

  -- 5. Mark as cancelled with reason recorded
  UPDATE public.inspections
     SET status = 'cancelled',
         notes = CASE
                   WHEN notes IS NULL OR notes = '' THEN '[CANCELLED]: ' || trim(p_reason)
                   ELSE notes || E'\n[CANCELLED]: ' || trim(p_reason)
                 END,
         completed_at = now()
   WHERE id = p_inspection_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_inspection(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_inspection(uuid, text) TO authenticated;

-- ── 9. RPC: create_inspection_template (Global Admin Only) ─────────────────

CREATE OR REPLACE FUNCTION public.create_inspection_template(
  p_name          text,
  p_category_id   uuid DEFAULT NULL,
  p_description   text DEFAULT NULL,
  p_interval_days integer DEFAULT NULL,
  p_sections      jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id     uuid := auth.uid();
  v_template_id  uuid;
  v_section_id   uuid;
  v_sec          jsonb;
  v_itm          jsonb;
BEGIN
  -- 1. Validate actor is authenticated
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Validate global authority: super_admin or active admin role assignment
  IF NOT (
    (SELECT is_super_admin FROM public.profiles WHERE id = v_actor_id)
    OR EXISTS (
      SELECT 1
        FROM public.user_warehouses uw
        JOIN public.roles r ON r.id = uw.role_id
       WHERE uw.user_id = v_actor_id
         AND uw.is_active = true
         AND r.name = 'admin'
    )
  ) THEN
    RAISE EXCEPTION 'Permission denied: Administrator or Super Admin authority required for global template management';
  END IF;

  -- 3. Validate template name
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Template name is required';
  END IF;

  -- 4. Validate category if provided
  IF p_category_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.asset_categories WHERE id = p_category_id
  ) THEN
    RAISE EXCEPTION 'Asset category % not found', p_category_id;
  END IF;

  -- 5. Validate interval if provided
  IF p_interval_days IS NOT NULL AND p_interval_days <= 0 THEN
    RAISE EXCEPTION 'inspection_interval_days must be greater than 0';
  END IF;

  -- 6. Insert template header
  INSERT INTO public.inspection_templates (
    name, category_id, description, inspection_interval_days, is_active, created_by
  ) VALUES (
    trim(p_name), p_category_id, p_description, p_interval_days, true, v_actor_id
  )
  RETURNING id INTO v_template_id;

  -- 7. Insert sections and items atomically
  IF p_sections IS NOT NULL AND jsonb_typeof(p_sections) = 'array' THEN
    FOR v_sec IN SELECT * FROM jsonb_array_elements(p_sections)
    LOOP
      INSERT INTO public.inspection_template_sections (
        template_id, title, sort_order
      ) VALUES (
        v_template_id,
        COALESCE(v_sec->>'title', 'General'),
        COALESCE((v_sec->>'sort_order')::int, 0)
      )
      RETURNING id INTO v_section_id;

      IF v_sec->'items' IS NOT NULL AND jsonb_typeof(v_sec->'items') = 'array' THEN
        FOR v_itm IN SELECT * FROM jsonb_array_elements(v_sec->'items')
        LOOP
          INSERT INTO public.inspection_template_items (
            section_id, label, description, is_required, sort_order
          ) VALUES (
            v_section_id,
            COALESCE(v_itm->>'label', 'Item'),
            v_itm->>'description',
            COALESCE((v_itm->>'is_required')::boolean, true),
            COALESCE((v_itm->>'sort_order')::int, 0)
          );
        END LOOP;
      END IF;
    END LOOP;
  END IF;

  RETURN v_template_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_inspection_template(text, uuid, text, integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_inspection_template(text, uuid, text, integer, jsonb) TO authenticated;

-- ── 10. RPC: deactivate_inspection_template (Global Admin Only) ────────────

CREATE OR REPLACE FUNCTION public.deactivate_inspection_template(
  p_template_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
BEGIN
  -- 1. Validate actor is authenticated
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Validate global authority: super_admin or active admin role assignment
  IF NOT (
    (SELECT is_super_admin FROM public.profiles WHERE id = v_actor_id)
    OR EXISTS (
      SELECT 1
        FROM public.user_warehouses uw
        JOIN public.roles r ON r.id = uw.role_id
       WHERE uw.user_id = v_actor_id
         AND uw.is_active = true
         AND r.name = 'admin'
    )
  ) THEN
    RAISE EXCEPTION 'Permission denied: Administrator or Super Admin authority required for global template management';
  END IF;

  -- 3. Validate template exists
  IF NOT EXISTS (SELECT 1 FROM public.inspection_templates WHERE id = p_template_id) THEN
    RAISE EXCEPTION 'Inspection template % not found', p_template_id;
  END IF;

  -- 4. Soft deactivate
  UPDATE public.inspection_templates
     SET is_active = false,
         updated_at = now()
   WHERE id = p_template_id;
END;
$$;

REVOKE ALL ON FUNCTION public.deactivate_inspection_template(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deactivate_inspection_template(uuid) TO authenticated;
