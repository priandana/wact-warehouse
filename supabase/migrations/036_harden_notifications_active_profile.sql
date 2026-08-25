-- 036_harden_notifications_active_profile.sql
-- Harden notifications RLS and RPCs for active-profile and current warehouse-access enforcement.
-- Enable PostgreSQL WAL publication for Supabase Realtime delivery.

-- ── 1. Harden notif_select Policy ──────────────────────────────────────────
-- A notification is readable only when:
-- 1. recipient_id = auth.uid()
-- 2. Caller profile is active (profiles.is_active = true)
-- 3. If notification references a case (data->>'case_id'), caller currently holds active access to that case's warehouse.
-- Uses text comparison (c.id::text = data->>'case_id') to avoid UUID-cast exceptions on malformed metadata.

DROP POLICY IF EXISTS notif_select ON public.notifications;
CREATE POLICY notif_select ON public.notifications FOR SELECT
  USING (
    recipient_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_active = true
    )
    AND (
      data->>'case_id' IS NULL
      OR EXISTS (
        SELECT 1 FROM public.cases c
        WHERE c.id::text = (notifications.data->>'case_id')
          AND c.warehouse_id = ANY(public.get_user_warehouse_ids())
      )
    )
  );

-- ── 2. Harden mark_notifications_read RPC ──────────────────────────────────
-- Enforces active profile status and current warehouse accessibility on bulk read mutations.

CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_notification_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Fail closed if caller profile is inactive
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active = true) THEN
    RETURN;
  END IF;

  UPDATE public.notifications n
     SET is_read = true, read_at = now()
   WHERE n.id = ANY(p_notification_ids)
     AND n.recipient_id = auth.uid()
     AND n.is_read = false
     AND (
       n.data->>'case_id' IS NULL
       OR EXISTS (
         SELECT 1 FROM public.cases c
         WHERE c.id::text = (n.data->>'case_id')
           AND c.warehouse_id = ANY(public.get_user_warehouse_ids())
       )
     );
END;
$$;

REVOKE ALL ON FUNCTION public.mark_notifications_read(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) TO authenticated, service_role;

-- ── 3. Enable Realtime Replication Publication ─────────────────────────────
-- Enables Postgres WAL changes on public.notifications to be broadcast to authenticated WebSocket subscribers.
-- Safely checks if the table is already published before adding.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END;
$$;
