-- 038_enable_sla_escalation_cron.sql
-- Phase UI-11 (Activation Gate): Enable Recurring SLA Escalation Cron Job
-- Depends on: 037_sla_escalation_and_tracking.sql (evaluate_sla_escalations)
--
-- Registers the background pg_cron job to periodically evaluate SLA escalations
-- every 15 minutes (*/15 * * * *) and generate confidential in-app notifications.
-- Strictly idempotent: safely unschedules any pre-existing registration before scheduling.

-- 1. Safely unschedule existing job with the same name if present
DO $$
DECLARE
  v_jobid bigint;
BEGIN
  SELECT jobid
    INTO v_jobid
    FROM cron.job
   WHERE jobname = 'wact-sla-escalation'
   LIMIT 1;

  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
END
$$;

-- 2. Schedule recurring SLA escalation evaluator
SELECT cron.schedule(
  'wact-sla-escalation',
  '*/15 * * * *',
  'SELECT public.evaluate_sla_escalations();'
);
