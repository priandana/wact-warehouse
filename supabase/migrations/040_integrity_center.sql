-- 040_integrity_center.sql
-- WACT Integrity Center / Anonymous Incident Reporting Architecture
-- Architecturally isolated from normal operational cases to ensure total reporter anonymity.
-- ZERO reporter identity columns (no auth user id, employee id, email, phone, IP, or user-agent).
-- Hardened: isolated secret hash table, strict server-side mutations, hardened RLS with Global Super Admin.

-- ── 1. Create Dedicated Role & Seed Capabilities ─────────────────────────────
-- Role: integrity_investigator (Integrity Investigator)
-- Idempotent role creation without fixed UUID requirement

INSERT INTO public.roles (name, display_name, description, sort_order)
VALUES (
  'integrity_investigator',
  'Integrity Investigator',
  'Penyelidik Integritas & Laporan Khusus Anonim',
  7
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

-- Seed capabilities for integrity_investigator
INSERT INTO public.role_capabilities (role_id, capability)
SELECT r.id, c.capability
FROM public.roles r
CROSS JOIN (
  VALUES
    ('integrity.view'),
    ('integrity.investigate'),
    ('integrity.assign'),
    ('integrity.change_severity'),
    ('integrity.message'),
    ('integrity.internal_note'),
    ('integrity.resolve'),
    ('integrity.export')
) AS c(capability)
WHERE r.name = 'integrity_investigator'
ON CONFLICT (role_id, capability) DO NOTHING;

-- ── 2. Create Integrity Center Tables ───────────────────────────────────────

-- 2.1 Main Reports Table (Zero access_secret_hash on this table to prevent investigator exposure)
CREATE TABLE IF NOT EXISTS public.integrity_reports (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_code                 text UNIQUE NOT NULL, -- e.g. INT-PDL-8K2M4X / INT-BDG-XXXXXX
  warehouse_id                uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  area_id                     uuid REFERENCES public.areas(id) ON DELETE SET NULL,
  location_id                 uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  category                    text NOT NULL CHECK (
                                category IN (
                                  'theft',
                                  'unauthorized_consumption',
                                  'stock_manipulation',
                                  'return_manipulation',
                                  'unauthorized_goods_movement',
                                  'asset_misuse',
                                  'supplier_vendor_collusion',
                                  'procedure_violation',
                                  'other'
                                )
                              ),
  severity                    text NOT NULL DEFAULT 'medium' CHECK (
                                severity IN ('low', 'medium', 'high', 'critical')
                              ),
  status                      text NOT NULL DEFAULT 'submitted' CHECK (
                                status IN (
                                  'submitted',
                                  'triage',
                                  'investigating',
                                  'action_required',
                                  'resolved',
                                  'unsubstantiated',
                                  'duplicate'
                                )
                              ),
  incident_datetime           timestamptz,
  description                 text NOT NULL,
  estimated_loss              numeric(15, 2),
  involved_party_description  text,
  assigned_investigator_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolution_notes            text,
  resolution_action           text,
  resolved_at                 timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- 2.2 Access Secret Hash Isolation Table (Zero client access — service role only)
CREATE TABLE IF NOT EXISTS public.integrity_report_secrets (
  report_id          uuid PRIMARY KEY REFERENCES public.integrity_reports(id) ON DELETE CASCADE,
  access_secret_hash text NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- 2.3 Anonymous Two-Way Messages Table
CREATE TABLE IF NOT EXISTS public.integrity_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id    uuid NOT NULL REFERENCES public.integrity_reports(id) ON DELETE CASCADE,
  sender_type  text NOT NULL CHECK (sender_type IN ('anonymous_reporter', 'investigator')),
  sender_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- NULL for anonymous reporter
  message      text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 2.4 Investigator Internal Notes (Private to Authorized Investigators Only)
CREATE TABLE IF NOT EXISTS public.integrity_internal_notes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id    uuid NOT NULL REFERENCES public.integrity_reports(id) ON DELETE CASCADE,
  author_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note         text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- 2.5 Evidence Photos Table
CREATE TABLE IF NOT EXISTS public.integrity_evidences (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id    uuid NOT NULL REFERENCES public.integrity_reports(id) ON DELETE CASCADE,
  message_id   uuid REFERENCES public.integrity_messages(id) ON DELETE SET NULL,
  storage_path text NOT NULL, -- {warehouseId}/{reportId}/{cryptoRandomId}.jpg
  file_name    text NOT NULL, -- Sanitized file label (NEVER original reporter client filename)
  file_size    bigint,
  mime_type    text NOT NULL DEFAULT 'image/jpeg',
  source_type  text NOT NULL CHECK (source_type IN ('anonymous_reporter', 'investigator')),
  caption      text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 2.6 Immutable Audit Activities Table
CREATE TABLE IF NOT EXISTS public.integrity_activities (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id    uuid NOT NULL REFERENCES public.integrity_reports(id) ON DELETE CASCADE,
  actor_type   text NOT NULL CHECK (actor_type IN ('anonymous_reporter', 'investigator', 'system')),
  actor_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- NULL for anonymous reporter
  action       text NOT NULL,
  from_status  text,
  to_status    text,
  metadata     jsonb DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 2.7 Investigator Assignment History Table
CREATE TABLE IF NOT EXISTS public.integrity_assignments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       uuid NOT NULL REFERENCES public.integrity_reports(id) ON DELETE CASCADE,
  investigator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_current      boolean NOT NULL DEFAULT true,
  assigned_at     timestamptz NOT NULL DEFAULT now(),
  unassigned_at   timestamptz
);

-- ── 3. Performance & Lookup Indexes ─────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_integrity_reports_code ON public.integrity_reports(report_code);
CREATE INDEX IF NOT EXISTS idx_integrity_reports_wh_status ON public.integrity_reports(warehouse_id, status);
CREATE INDEX IF NOT EXISTS idx_integrity_reports_investigator ON public.integrity_reports(assigned_investigator_id);
CREATE INDEX IF NOT EXISTS idx_integrity_reports_created ON public.integrity_reports(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_integrity_messages_report ON public.integrity_messages(report_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_integrity_notes_report ON public.integrity_internal_notes(report_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integrity_evidences_report ON public.integrity_evidences(report_id);
CREATE INDEX IF NOT EXISTS idx_integrity_activities_report ON public.integrity_activities(report_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_integrity_assignments_report ON public.integrity_assignments(report_id, is_current);

-- ── 4. Storage Bucket Configuration & Hardened Policies ─────────────────────

-- Ensure private storage bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'integrity-evidences',
  'integrity-evidences',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Storage RLS: Authenticated Investigators with active warehouse capability (or Global Super Admin)
CREATE POLICY "integrity-evidences: investigator read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'integrity-evidences'
  AND (
    public.is_super_admin()
    OR (
      (storage.foldername(name))[1] = ANY(public.get_user_warehouse_ids()::text[])
      AND public.has_capability((storage.foldername(name))[1]::uuid, 'integrity.view')
    )
  )
);

CREATE POLICY "integrity-evidences: investigator upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'integrity-evidences'
  AND (
    public.is_super_admin()
    OR (
      (storage.foldername(name))[1] = ANY(public.get_user_warehouse_ids()::text[])
      AND public.has_capability((storage.foldername(name))[1]::uuid, 'integrity.investigate')
    )
  )
);

CREATE POLICY "integrity-evidences: investigator delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'integrity-evidences'
  AND (
    public.is_super_admin()
    OR (
      (storage.foldername(name))[1] = ANY(public.get_user_warehouse_ids()::text[])
      AND public.has_capability((storage.foldername(name))[1]::uuid, 'integrity.resolve')
    )
  )
);

-- ── 5. Row Level Security (RLS) on Integrity Tables ─────────────────────────

ALTER TABLE public.integrity_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrity_report_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrity_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrity_internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrity_evidences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrity_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrity_assignments ENABLE ROW LEVEL SECURITY;

-- 5.1 integrity_reports Policies (Controlled mutations only — NO direct client UPDATE/INSERT/DELETE)
CREATE POLICY "integrity_reports_select"
ON public.integrity_reports FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR (
    warehouse_id = ANY(public.get_user_warehouse_ids())
    AND public.has_capability(warehouse_id, 'integrity.view')
  )
);

CREATE POLICY "integrity_reports_insert_deny" ON public.integrity_reports FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "integrity_reports_update_deny" ON public.integrity_reports FOR UPDATE TO authenticated USING (false);
CREATE POLICY "integrity_reports_delete_deny" ON public.integrity_reports FOR DELETE TO authenticated USING (false);

-- 5.2 integrity_report_secrets Policies (Zero client access — service role only)
CREATE POLICY "integrity_report_secrets_deny_all"
ON public.integrity_report_secrets
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);

-- 5.3 integrity_messages Policies
CREATE POLICY "integrity_messages_select"
ON public.integrity_messages FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.integrity_reports r
    WHERE r.id = integrity_messages.report_id
      AND r.warehouse_id = ANY(public.get_user_warehouse_ids())
      AND public.has_capability(r.warehouse_id, 'integrity.view')
  )
);

CREATE POLICY "integrity_messages_insert"
ON public.integrity_messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_type = 'investigator'
  AND sender_id = auth.uid()
  AND (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.integrity_reports r
      WHERE r.id = integrity_messages.report_id
        AND r.warehouse_id = ANY(public.get_user_warehouse_ids())
        AND public.has_capability(r.warehouse_id, 'integrity.message')
    )
  )
);

-- 5.4 integrity_internal_notes Policies
CREATE POLICY "integrity_notes_select"
ON public.integrity_internal_notes FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.integrity_reports r
    WHERE r.id = integrity_internal_notes.report_id
      AND r.warehouse_id = ANY(public.get_user_warehouse_ids())
      AND public.has_capability(r.warehouse_id, 'integrity.internal_note')
  )
);

CREATE POLICY "integrity_notes_insert"
ON public.integrity_internal_notes FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.integrity_reports r
      WHERE r.id = integrity_internal_notes.report_id
        AND r.warehouse_id = ANY(public.get_user_warehouse_ids())
        AND public.has_capability(r.warehouse_id, 'integrity.internal_note')
    )
  )
);

-- 5.5 integrity_evidences Policies
CREATE POLICY "integrity_evidences_select"
ON public.integrity_evidences FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.integrity_reports r
    WHERE r.id = integrity_evidences.report_id
      AND r.warehouse_id = ANY(public.get_user_warehouse_ids())
      AND public.has_capability(r.warehouse_id, 'integrity.view')
  )
);

CREATE POLICY "integrity_evidences_insert"
ON public.integrity_evidences FOR INSERT
TO authenticated
WITH CHECK (
  source_type = 'investigator'
  AND (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.integrity_reports r
      WHERE r.id = integrity_evidences.report_id
        AND r.warehouse_id = ANY(public.get_user_warehouse_ids())
        AND public.has_capability(r.warehouse_id, 'integrity.investigate')
    )
  )
);

-- 5.6 integrity_activities Policies (Strictly audit read-only for authorized investigators)
CREATE POLICY "integrity_activities_select"
ON public.integrity_activities FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.integrity_reports r
    WHERE r.id = integrity_activities.report_id
      AND r.warehouse_id = ANY(public.get_user_warehouse_ids())
      AND public.has_capability(r.warehouse_id, 'integrity.view')
  )
);

CREATE POLICY "integrity_activities_insert_deny" ON public.integrity_activities FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "integrity_activities_update_deny" ON public.integrity_activities FOR UPDATE TO authenticated USING (false);
CREATE POLICY "integrity_activities_delete_deny" ON public.integrity_activities FOR DELETE TO authenticated USING (false);

-- 5.7 integrity_assignments Policies
CREATE POLICY "integrity_assignments_select"
ON public.integrity_assignments FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.integrity_reports r
    WHERE r.id = integrity_assignments.report_id
      AND r.warehouse_id = ANY(public.get_user_warehouse_ids())
      AND public.has_capability(r.warehouse_id, 'integrity.view')
  )
);

CREATE POLICY "integrity_assignments_insert_deny" ON public.integrity_assignments FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "integrity_assignments_update_deny" ON public.integrity_assignments FOR UPDATE TO authenticated USING (false);
CREATE POLICY "integrity_assignments_delete_deny" ON public.integrity_assignments FOR DELETE TO authenticated USING (false);

-- ── 6. Triggers & Helper Functions ──────────────────────────────────────────

-- Helper function: log_integrity_activity (STRICTLY service_role only — prevent client spoofing)
CREATE OR REPLACE FUNCTION public.log_integrity_activity(
  p_report_id    uuid,
  p_actor_type   text,
  p_actor_id     uuid,
  p_action       text,
  p_from_status  text DEFAULT NULL,
  p_to_status    text DEFAULT NULL,
  p_metadata     jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.integrity_activities (
    report_id,
    actor_type,
    actor_id,
    action,
    from_status,
    to_status,
    metadata
  ) VALUES (
    p_report_id,
    p_actor_type,
    p_actor_id,
    p_action,
    p_from_status,
    p_to_status,
    p_metadata
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_integrity_activity(uuid, text, uuid, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_integrity_activity(uuid, text, uuid, text, text, text, jsonb) TO service_role;

-- Auto-update timestamp trigger for integrity_reports
CREATE OR REPLACE FUNCTION public.update_integrity_reports_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_integrity_reports_timestamp ON public.integrity_reports;
CREATE TRIGGER trg_integrity_reports_timestamp
BEFORE UPDATE ON public.integrity_reports
FOR EACH ROW EXECUTE FUNCTION public.update_integrity_reports_timestamp();
