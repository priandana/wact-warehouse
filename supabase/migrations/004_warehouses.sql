-- 004_warehouses.sql
-- Warehouses with timezone support

CREATE TABLE public.warehouses (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code       text UNIQUE NOT NULL,
  name       text NOT NULL,
  address    text,
  timezone   text NOT NULL DEFAULT 'Asia/Jakarta',
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Support composite FK from child tables (id, code pair needed for case number integrity)
ALTER TABLE public.warehouses ADD CONSTRAINT warehouses_id_code_uq UNIQUE (id, code);

-- user_warehouses: multi-warehouse RBAC junction (created here, references roles from 003)
CREATE TABLE public.user_warehouses (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  role_id      uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  is_active    boolean NOT NULL DEFAULT true,
  assigned_by  uuid REFERENCES public.profiles(id),
  assigned_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, warehouse_id, role_id)
);

CREATE INDEX idx_uw_user_wh ON public.user_warehouses(user_id, warehouse_id, is_active);
CREATE INDEX idx_uw_warehouse ON public.user_warehouses(warehouse_id);

-- RLS
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
-- All authenticated users can read warehouses they have access to (via user_warehouses)
CREATE POLICY warehouses_select ON public.warehouses FOR SELECT
  USING (
    is_active = true AND (
      (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.user_warehouses
        WHERE user_id = auth.uid()
          AND warehouse_id = warehouses.id
          AND is_active = true
      )
    )
  );
CREATE POLICY warehouses_insert ON public.warehouses FOR INSERT WITH CHECK (false);
CREATE POLICY warehouses_update ON public.warehouses FOR UPDATE USING (false);
CREATE POLICY warehouses_delete ON public.warehouses FOR DELETE USING (false);

ALTER TABLE public.user_warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY uw_select ON public.user_warehouses FOR SELECT
  USING (
    user_id = auth.uid()
    OR (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())
  );
CREATE POLICY uw_insert ON public.user_warehouses FOR INSERT WITH CHECK (false);
CREATE POLICY uw_update ON public.user_warehouses FOR UPDATE USING (false);
CREATE POLICY uw_delete ON public.user_warehouses FOR DELETE USING (false);
