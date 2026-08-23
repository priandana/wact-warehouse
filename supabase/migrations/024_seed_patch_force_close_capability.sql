-- 024_seed_patch_force_close_capability.sql
-- Add case.force_close capability to admin role only.
-- Patch to 019_seed.sql — safe to run after seed.

INSERT INTO public.role_capabilities (role_id, capability)
SELECT id, 'case.force_close'
FROM public.roles
WHERE name = 'admin'
ON CONFLICT DO NOTHING;
