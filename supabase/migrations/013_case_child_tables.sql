-- 013_case_child_tables.sql
-- All case child tables: assignments, activities, comments, evidences, due_date_changes
-- Depends on: cases (012), profiles (002)

-- ── Case Assignments ──────────────────────────────────────────────────────

CREATE TABLE public.case_assignments (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id       uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  assignee_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  assigned_by   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  assigned_at   timestamptz NOT NULL DEFAULT now(),
  unassigned_at timestamptz,
  is_current    boolean NOT NULL DEFAULT true
);

-- At most ONE current assignment per case (partial unique index)
CREATE UNIQUE INDEX uq_case_current_assignment
  ON public.case_assignments(case_id)
  WHERE is_current = true;

CREATE INDEX idx_assignments_case     ON public.case_assignments(case_id);
CREATE INDEX idx_assignments_assignee ON public.case_assignments(assignee_id) WHERE is_current = true;

ALTER TABLE public.case_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY case_assign_select ON public.case_assignments FOR SELECT
  USING (
    assignee_id = auth.uid()
    OR assigned_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_assignments.case_id AND c.reporter_id = auth.uid()
    )
  );
CREATE POLICY case_assign_insert ON public.case_assignments FOR INSERT WITH CHECK (false);
CREATE POLICY case_assign_update ON public.case_assignments FOR UPDATE USING (false);
CREATE POLICY case_assign_delete ON public.case_assignments FOR DELETE USING (false);

-- ── Case Activities (append-only, immutable) ──────────────────────────────

CREATE TABLE public.case_activities (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id     uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  actor_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action      text NOT NULL,
  -- Values: 'created' | 'assigned' | 'status_changed' | 'commented'
  -- | 'due_date_overridden' | 'evidence_added' | 'verified'
  -- | 'closed' | 'reopened' | 'maintenance_updated' | 'verification_failed'
  from_status text,
  to_status   text,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activities_case ON public.case_activities(case_id, created_at DESC);

ALTER TABLE public.case_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY activities_select ON public.case_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_activities.case_id
        AND (
          c.reporter_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.case_assignments ca
            WHERE ca.case_id = c.id AND ca.assignee_id = auth.uid()
          )
          OR (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())
        )
    )
  );
-- No INSERT/UPDATE/DELETE from client — all via SECURITY DEFINER RPCs
CREATE POLICY activities_insert ON public.case_activities FOR INSERT WITH CHECK (false);
CREATE POLICY activities_update ON public.case_activities FOR UPDATE USING (false);
CREATE POLICY activities_delete ON public.case_activities FOR DELETE USING (false);

-- ── Case Comments ─────────────────────────────────────────────────────────

CREATE TABLE public.case_comments (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id     uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  content     text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER case_comments_updated_at
  BEFORE UPDATE ON public.case_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_comments_case ON public.case_comments(case_id, created_at);

ALTER TABLE public.case_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY comments_select ON public.case_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_comments.case_id
        AND (
          c.reporter_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.case_assignments ca
            WHERE ca.case_id = c.id AND ca.assignee_id = auth.uid()
          )
          OR (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())
        )
    )
  );
CREATE POLICY comments_insert ON public.case_comments FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_comments.case_id
        AND (
          c.reporter_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.case_assignments ca
            WHERE ca.case_id = c.id AND ca.assignee_id = auth.uid()
          )
          OR (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())
        )
    )
  );
CREATE POLICY comments_update ON public.case_comments FOR UPDATE
  USING (author_id = auth.uid());
CREATE POLICY comments_delete ON public.case_comments FOR DELETE USING (false);

-- ── Case Evidences ────────────────────────────────────────────────────────

CREATE TABLE public.case_evidences (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id     uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  uploader_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  phase       text NOT NULL CHECK (phase IN ('before', 'during', 'after')),
  file_url    text NOT NULL,
  file_name   text,
  file_size   int CHECK (file_size > 0),
  mime_type   text,
  caption     text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_evidences_case ON public.case_evidences(case_id);

ALTER TABLE public.case_evidences ENABLE ROW LEVEL SECURITY;
CREATE POLICY evidences_select ON public.case_evidences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_evidences.case_id
        AND (
          c.reporter_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.case_assignments ca
            WHERE ca.case_id = c.id AND ca.assignee_id = auth.uid()
          )
          OR (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())
        )
    )
  );
CREATE POLICY evidences_insert ON public.case_evidences FOR INSERT WITH CHECK (false);
CREATE POLICY evidences_update ON public.case_evidences FOR UPDATE USING (false);
CREATE POLICY evidences_delete ON public.case_evidences FOR DELETE USING (false);

-- ── Due Date Changes (audit trail) ────────────────────────────────────────

CREATE TABLE public.due_date_changes (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id           uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  changed_by        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  previous_due_date timestamptz NOT NULL,
  new_due_date      timestamptz NOT NULL,
  reason            text NOT NULL,   -- enforced NOT NULL at DB level; also validated by Zod
  changed_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_due_changes_case ON public.due_date_changes(case_id);

ALTER TABLE public.due_date_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY due_changes_select ON public.due_date_changes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = due_date_changes.case_id
        AND (
          c.reporter_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.case_assignments ca
            WHERE ca.case_id = c.id AND ca.assignee_id = auth.uid()
          )
          OR (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())
        )
    )
  );
CREATE POLICY due_changes_insert ON public.due_date_changes FOR INSERT WITH CHECK (false);
CREATE POLICY due_changes_update ON public.due_date_changes FOR UPDATE USING (false);
CREATE POLICY due_changes_delete ON public.due_date_changes FOR DELETE USING (false);
