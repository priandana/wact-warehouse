-- 015_notifications_audit_analytics.sql
-- Notifications, audit_logs, case_daily_summary
-- Depends on: profiles (002), warehouses (004), case_categories (006)

-- ── Notifications ─────────────────────────────────────────────────────────

CREATE TABLE public.notifications (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type         text NOT NULL,
  -- 'case_assigned' | 'case_overdue' | 'status_changed'
  -- | 'waiting_verification' | 'reopened' | 'maintenance_completed'
  -- | 'due_date_overridden' | 'verification_failed'
  title        text NOT NULL,
  body         text,
  data         jsonb,
  is_read      boolean NOT NULL DEFAULT false,
  read_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_recipient
  ON public.notifications(recipient_id, is_read, created_at DESC);

-- Supabase Realtime should be enabled on this table for live bell updates

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
-- Recipients can only see their own notifications
CREATE POLICY notif_select ON public.notifications FOR SELECT
  USING (recipient_id = auth.uid());
-- Mark as read (update is_read + read_at)
CREATE POLICY notif_update ON public.notifications FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());
-- Inserts only from SECURITY DEFINER functions (server-side)
CREATE POLICY notif_insert ON public.notifications FOR INSERT WITH CHECK (false);
CREATE POLICY notif_delete ON public.notifications FOR DELETE USING (false);

-- Stub: future channel config (not implemented in V1)
CREATE TABLE public.notification_channel_configs (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel    text NOT NULL CHECK (channel IN ('email', 'whatsapp', 'push')),
  config     jsonb,
  is_active  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_channel_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY notif_chan_select ON public.notification_channel_configs FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY notif_chan_insert ON public.notification_channel_configs FOR INSERT WITH CHECK (false);
CREATE POLICY notif_chan_update ON public.notification_channel_configs FOR UPDATE USING (false);
CREATE POLICY notif_chan_delete ON public.notification_channel_configs FOR DELETE USING (false);

-- ── Audit Logs ────────────────────────────────────────────────────────────

CREATE TABLE public.audit_logs (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name text NOT NULL,
  record_id  uuid NOT NULL,
  action     text NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  actor_id   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  old_data   jsonb,
  new_data   jsonb,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_record  ON public.audit_logs(table_name, record_id);
CREATE INDEX idx_audit_actor   ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
-- Only super_admin can read audit logs from client
CREATE POLICY audit_select ON public.audit_logs FOR SELECT
  USING ((SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY audit_insert ON public.audit_logs FOR INSERT WITH CHECK (false);
CREATE POLICY audit_update ON public.audit_logs FOR UPDATE USING (false);
CREATE POLICY audit_delete ON public.audit_logs FOR DELETE USING (false);

-- ── Analytics Pre-Aggregation ─────────────────────────────────────────────

CREATE TABLE public.case_daily_summary (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  summary_date         date NOT NULL,           -- in warehouse local timezone
  warehouse_id         uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  category_id          uuid REFERENCES public.case_categories(id) ON DELETE SET NULL,
  priority             text CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status               text,
  total_cases          int NOT NULL DEFAULT 0,
  closed_cases         int NOT NULL DEFAULT 0,
  avg_resolution_hours numeric,
  overdue_cases        int NOT NULL DEFAULT 0,
  refreshed_at         timestamptz NOT NULL DEFAULT now(),

  UNIQUE(summary_date, warehouse_id, category_id, priority, status)
);

CREATE INDEX idx_daily_summary ON public.case_daily_summary(warehouse_id, summary_date DESC);

ALTER TABLE public.case_daily_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY summary_select ON public.case_daily_summary FOR SELECT
  USING (
    warehouse_id = ANY(
      CASE
        WHEN (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())
        THEN ARRAY(SELECT id FROM public.warehouses WHERE is_active = true)
        ELSE ARRAY(SELECT DISTINCT warehouse_id FROM public.user_warehouses
                   WHERE user_id = auth.uid() AND is_active = true)
      END
    )
  );
CREATE POLICY summary_insert ON public.case_daily_summary FOR INSERT WITH CHECK (false);
CREATE POLICY summary_update ON public.case_daily_summary FOR UPDATE USING (false);
CREATE POLICY summary_delete ON public.case_daily_summary FOR DELETE USING (false);
