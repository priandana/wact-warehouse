-- 008_sla_configurations.sql
-- SLA configurations — configurable per warehouse × priority
-- Depends on: warehouses (004), profiles (002)

CREATE TABLE public.sla_configurations (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id   uuid REFERENCES public.warehouses(id) ON DELETE CASCADE,
  -- NULL = global fallback (applies to all warehouses without specific config)
  priority       text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  duration_hours numeric NOT NULL CHECK (duration_hours > 0),
  is_active      boolean NOT NULL DEFAULT true,
  created_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER sla_configurations_updated_at
  BEFORE UPDATE ON public.sla_configurations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Partial unique indexes — handles PostgreSQL NULL behavior correctly
-- Multiple NULLs are allowed by standard UNIQUE, so we need partial indexes:
CREATE UNIQUE INDEX uq_sla_global_priority
  ON public.sla_configurations(priority)
  WHERE warehouse_id IS NULL;

CREATE UNIQUE INDEX uq_sla_warehouse_priority
  ON public.sla_configurations(warehouse_id, priority)
  WHERE warehouse_id IS NOT NULL;

-- RLS: readable by authenticated, manageable by service role only
ALTER TABLE public.sla_configurations ENABLE ROW LEVEL SECURITY;
CREATE POLICY sla_select ON public.sla_configurations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY sla_insert ON public.sla_configurations FOR INSERT WITH CHECK (false);
CREATE POLICY sla_update ON public.sla_configurations FOR UPDATE USING (false);
CREATE POLICY sla_delete ON public.sla_configurations FOR DELETE USING (false);
