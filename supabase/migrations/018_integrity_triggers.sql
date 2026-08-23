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
