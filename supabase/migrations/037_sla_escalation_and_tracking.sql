-- 037_sla_escalation_and_tracking.sql
-- Phase UI-11 (Checkpoint 1): SLA Escalation Evaluator & Idempotency Tracking
-- Depends on: cases (012), profiles (002), user_warehouses (004), case_assignments (013), notifications (015), send_notification (016/026)
--
-- NOTE: This migration establishes the database infrastructure, table security,
-- and evaluation RPC. It intentionally DOES NOT activate the recurring cron job yet.
-- The cron scheduler will be activated in a separate migration (038) after the
-- Notification Center UI components are deployed and verified.

-- 1. Enable pg_cron extension for database-native background scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Create internal idempotency tracking table for SLA alerts
CREATE TABLE public.case_sla_escalations (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id          uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  escalation_level text NOT NULL CHECK (escalation_level IN ('approaching', 'overdue')),
  due_date         timestamptz NOT NULL,
  recipient_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notified_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_case_sla_escalation UNIQUE (case_id, escalation_level, due_date, recipient_id)
);

-- Enable RLS (Zero access by default)
ALTER TABLE public.case_sla_escalations ENABLE ROW LEVEL SECURITY;

-- 3. Security Hardening: Revoke all table privileges from client roles
REVOKE ALL ON TABLE public.case_sla_escalations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.case_sla_escalations TO service_role;

-- 4. Authoritative SLA Escalator Function
-- Evaluates active cases requiring escalation, resolves deduplicated recipients,
-- and atomically creates notifications and tracking records.
CREATE OR REPLACE FUNCTION public.evaluate_sla_escalations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case record;
  v_recipient record;
  v_level text;
  v_notification_type text;
  v_title text;
  v_body text;
  v_escalation_id uuid;
  v_sent_count int := 0;
  v_evaluated_count int := 0;
BEGIN
  -- Filter candidates at query level: only inspect active cases within the 4-hour escalation window or overdue
  FOR v_case IN
    SELECT c.id, c.case_number, c.title, c.due_date, c.warehouse_id, c.status
      FROM public.cases c
     WHERE c.status NOT IN ('closed')
       AND c.due_date IS NOT NULL
       AND c.due_date <= (now() + interval '4 hours')
  LOOP
    v_evaluated_count := v_evaluated_count + 1;

    -- Evaluate escalation tier based on UTC timestamp comparison
    IF v_case.due_date <= now() THEN
      v_level := 'overdue';
      v_notification_type := 'sla_overdue';
      v_title := 'SLA Terlewati (Overdue): ' || v_case.case_number;
      v_body := 'Target waktu penyelesaian kasus "' || v_case.title || '" telah terlewati dan membutuhkan eskalasi.';
    ELSE
      v_level := 'approaching';
      v_notification_type := 'sla_approaching';
      v_title := 'SLA Mendekati Batas: ' || v_case.case_number;
      v_body := 'Sisa waktu penanganan kurang dari 4 jam untuk kasus "' || v_case.title || '".';
    END IF;

    -- Resolve authoritative, deduplicated recipients for this warehouse & case
    FOR v_recipient IN
      SELECT DISTINCT u.recipient_id
        FROM (
          -- 1. Current assigned PIC (active account & active warehouse membership)
          SELECT ca.assignee_id AS recipient_id
            FROM public.case_assignments ca
            JOIN public.profiles p ON p.id = ca.assignee_id
            JOIN public.user_warehouses uw ON uw.user_id = ca.assignee_id AND uw.warehouse_id = v_case.warehouse_id
           WHERE ca.case_id = v_case.id
             AND ca.is_current = true
             AND p.is_active = true
             AND uw.is_active = true

          UNION

          -- 2. Active Warehouse Coordinators
          SELECT uw.user_id AS recipient_id
            FROM public.user_warehouses uw
            JOIN public.roles r ON r.id = uw.role_id
            JOIN public.profiles p ON p.id = uw.user_id
           WHERE uw.warehouse_id = v_case.warehouse_id
             AND uw.is_active = true
             AND p.is_active = true
             AND r.name = 'coordinator'

          UNION

          -- 3. Active Warehouse Admins (Escalation only for 'overdue' level)
          SELECT uw.user_id AS recipient_id
            FROM public.user_warehouses uw
            JOIN public.roles r ON r.id = uw.role_id
            JOIN public.profiles p ON p.id = uw.user_id
           WHERE v_level = 'overdue'
             AND uw.warehouse_id = v_case.warehouse_id
             AND uw.is_active = true
             AND p.is_active = true
             AND r.name = 'admin'
        ) u
    LOOP
      -- Atomic idempotency insertion: attempts to register the tracking row first
      INSERT INTO public.case_sla_escalations (case_id, escalation_level, due_date, recipient_id)
      VALUES (v_case.id, v_level, v_case.due_date, v_recipient.recipient_id)
      ON CONFLICT (case_id, escalation_level, due_date, recipient_id) DO NOTHING
      RETURNING id INTO v_escalation_id;

      -- Generate in-app notification ONLY if tracking record was newly inserted
      IF v_escalation_id IS NOT NULL THEN
        PERFORM public.send_notification(
          v_recipient.recipient_id,
          v_notification_type,
          v_title,
          v_body,
          jsonb_build_object('case_id', v_case.id)
        );
        v_sent_count := v_sent_count + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'evaluated_cases', v_evaluated_count,
    'notifications_sent', v_sent_count,
    'evaluated_at', now()
  );
END;
$$;

-- 5. Revoke execution from client roles (Zero access for anon/authenticated)
REVOKE ALL ON FUNCTION public.evaluate_sla_escalations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_sla_escalations() TO service_role;
