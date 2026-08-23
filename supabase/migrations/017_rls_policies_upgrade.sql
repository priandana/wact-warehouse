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
