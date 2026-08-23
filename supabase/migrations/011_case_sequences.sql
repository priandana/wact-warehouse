-- 011_case_sequences.sql
-- Atomic case number sequence table
-- Depends on: warehouses (004)
-- Uses date type (not text) — formatted to yyMMdd only in TypeScript

CREATE TABLE public.case_sequences (
  warehouse_id  uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  sequence_date date NOT NULL,
  -- DB stores: 2026-08-22 (full date in warehouse local timezone, converted server-side)
  -- Case number displays: yyMMdd = '260822' (formatted in TypeScript, not stored here)
  last_sequence int NOT NULL DEFAULT 0,
  PRIMARY KEY (warehouse_id, sequence_date)
);

-- Atomic sequence function
-- Security: validates caller has case.create capability in the warehouse.
-- Must be called server-side only (within createCase server action).
-- search_path hardened to prevent schema injection.
CREATE OR REPLACE FUNCTION public.next_case_sequence(
  p_warehouse_id uuid,
  p_date         date
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq int;
BEGIN
  -- Security: caller must have case.create capability in this warehouse
  -- has_capability is defined in 017_rls_functions.sql; since migrations run in order,
  -- during Phase 1 testing this check will be enforced after 017 is applied.
  -- For clean migration chain, we inline the check here:
  IF NOT (
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.user_warehouses uw
      JOIN public.role_capabilities rc ON rc.role_id = uw.role_id
      WHERE uw.user_id      = auth.uid()
        AND uw.warehouse_id = p_warehouse_id
        AND uw.is_active    = true
        AND rc.capability   = 'case.create'
    )
  ) THEN
    RAISE EXCEPTION 'Permission denied: cannot create cases in warehouse %', p_warehouse_id;
  END IF;

  INSERT INTO public.case_sequences (warehouse_id, sequence_date, last_sequence)
  VALUES (p_warehouse_id, p_date, 1)
  ON CONFLICT (warehouse_id, sequence_date)
  DO UPDATE SET last_sequence = public.case_sequences.last_sequence + 1
  RETURNING last_sequence INTO v_seq;

  RETURN v_seq;
END;
$$;

-- Restrict EXECUTE to authenticated users only (not anon)
REVOKE ALL ON FUNCTION public.next_case_sequence(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_case_sequence(uuid, date) TO authenticated;
