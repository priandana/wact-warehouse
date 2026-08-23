-- 014_maintenance.sql
-- Maintenance actions
-- Depends on: cases (012), warehouses (004), profiles (002)
-- Cross-warehouse integrity enforced via trigger in 019

CREATE TABLE public.maintenance_actions (
  id                          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id                     uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  warehouse_id                uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  pic_id                      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_description          text NOT NULL,
  action_taken                text,
  parts_used                  text,
  started_at                  timestamptz,
  completed_at                timestamptz,
  verification_requested_at   timestamptz,
  verified_by                 uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at                 timestamptz,
  status                      text NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'in_progress', 'done', 'rejected')),
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),

  -- PIC cannot verify their own repair
  CONSTRAINT chk_verifier_not_pic CHECK (verified_by IS NULL OR verified_by <> pic_id)
);

CREATE TRIGGER maintenance_updated_at
  BEFORE UPDATE ON public.maintenance_actions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_maintenance_case      ON public.maintenance_actions(case_id);
CREATE INDEX idx_maintenance_warehouse ON public.maintenance_actions(warehouse_id);
CREATE INDEX idx_maintenance_pic       ON public.maintenance_actions(pic_id);

-- RLS
ALTER TABLE public.maintenance_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY maint_select ON public.maintenance_actions FOR SELECT
  USING (
    warehouse_id = ANY(
      CASE
        WHEN (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())
        THEN ARRAY(SELECT id FROM public.warehouses WHERE is_active = true)
        ELSE ARRAY(SELECT DISTINCT warehouse_id FROM public.user_warehouses
                   WHERE user_id = auth.uid() AND is_active = true)
      END
    )
    AND (
      pic_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.cases c
        WHERE c.id = maintenance_actions.case_id
          AND c.reporter_id = auth.uid()
      )
      OR (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())
    )
  );
CREATE POLICY maint_insert ON public.maintenance_actions FOR INSERT WITH CHECK (false);
CREATE POLICY maint_update ON public.maintenance_actions FOR UPDATE USING (false);
CREATE POLICY maint_delete ON public.maintenance_actions FOR DELETE USING (false);
