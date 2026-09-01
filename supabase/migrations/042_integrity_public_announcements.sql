-- 042_integrity_public_announcements.sql
-- Editable Public Announcements for WACT Integrity Center
-- Hardened Security Model: Zero Client Direct Table Exposure.
--
-- Security Target:
-- 1. Table: integrity_public_announcements
-- 2. Clean slate: Revoke all privileges from PUBLIC, anon, and authenticated before applying least-privilege grants.
-- 3. Confidentiality: updated_by and internal metadata MUST NEVER be exposed to anon or normal authenticated users.
-- 4. Architecture: No direct SELECT/INSERT/UPDATE/DELETE granted to anon or authenticated.
-- 5. Service Role: Full management permissions for server actions.
-- 6. Public Delivery: Handled exclusively via server-side action returning a sanitized DTO (zero updated_by).
-- 7. Mutations: Strictly verified against canonical is_super_admin at the server action boundary.
-- 8. Seeding: Default announcement uses updated_by = NULL (system-seeded, idempotent insert).

-- ── 1. Create Public Announcements Table ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.integrity_public_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'important', 'warning')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  show_on_report BOOLEAN NOT NULL DEFAULT true,
  show_on_track BOOLEAN NOT NULL DEFAULT true,
  publish_start TIMESTAMPTZ NULL,
  publish_end TIMESTAMPTZ NULL,
  updated_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. Performance Indexes ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_integrity_announcements_report 
ON public.integrity_public_announcements (is_active, show_on_report, publish_start, publish_end);

CREATE INDEX IF NOT EXISTS idx_integrity_announcements_track 
ON public.integrity_public_announcements (is_active, show_on_track, publish_start, publish_end);

-- ── 3. Clean Slate Privilege Reset ───────────────────────────────────────────

REVOKE ALL ON public.integrity_public_announcements FROM PUBLIC, anon, authenticated;

-- ── 4. Service Role Privileges (Server Boundary Mediation Only) ──────────────

GRANT ALL ON public.integrity_public_announcements TO service_role;

-- ── 5. Explicit Defense-in-Depth for Client Roles ────────────────────────────
-- anon and authenticated have ZERO direct table privileges on this table.
-- Public delivery is mediated via Server Actions returning sanitized DTOs.

-- ── 6. Row Level Security Policies (Fail-Closed) ─────────────────────────────

ALTER TABLE public.integrity_public_announcements ENABLE ROW LEVEL SECURITY;

-- Deny all direct client access from PostgREST / browser-side Supabase client
DROP POLICY IF EXISTS "Deny direct anon access" ON public.integrity_public_announcements;
CREATE POLICY "Deny direct anon access"
ON public.integrity_public_announcements
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "Deny direct authenticated client access" ON public.integrity_public_announcements;
CREATE POLICY "Deny direct authenticated client access"
ON public.integrity_public_announcements
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- ── 7. Seed Initial Default Public Announcement (Idempotent) ─────────────────

INSERT INTO public.integrity_public_announcements (
  title,
  body,
  type,
  is_active,
  show_on_report,
  show_on_track,
  updated_by
)
SELECT
  'Jangan Takut untuk Melapor',
  'Gunakan saluran ini apabila Anda mengetahui dugaan pencurian, konsumsi barang tanpa izin, manipulasi stok, atau pelanggaran lainnya. Identitas Anda tidak dicatat oleh sistem WACT.',
  'info',
  true,
  true,
  true,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.integrity_public_announcements
);

-- ── 8. Reload PostgREST Schema Cache ─────────────────────────────────────────

NOTIFY pgrst, 'reload schema';

