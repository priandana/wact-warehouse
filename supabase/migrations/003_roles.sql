-- 003_roles.sql
-- Roles and DB-level capability registry

CREATE TABLE public.roles (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description  text,
  sort_order   int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- DB-level capability registry — drives has_capability() RLS function
CREATE TABLE public.role_capabilities (
  role_id    uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  capability text NOT NULL,
  PRIMARY KEY (role_id, capability)
);

CREATE INDEX idx_role_cap_lookup ON public.role_capabilities(capability, role_id);

-- RLS: roles and capabilities are readable by all authenticated users
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY roles_select ON public.roles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY roles_insert ON public.roles FOR INSERT WITH CHECK (false); -- managed by admin only via service role
CREATE POLICY roles_update ON public.roles FOR UPDATE USING (false);
CREATE POLICY roles_delete ON public.roles FOR DELETE USING (false);

ALTER TABLE public.role_capabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY role_cap_select ON public.role_capabilities FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY role_cap_insert ON public.role_capabilities FOR INSERT WITH CHECK (false);
CREATE POLICY role_cap_update ON public.role_capabilities FOR UPDATE USING (false);
CREATE POLICY role_cap_delete ON public.role_capabilities FOR DELETE USING (false);
