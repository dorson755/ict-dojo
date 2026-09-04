-- The diagnostic/actions.ts writes `baseline_wpm` and `last_assessed_at` to typing_dna,
-- but these columns don't exist in the original schema (003). Add them now.

ALTER TABLE public.typing_dna
  ADD COLUMN IF NOT EXISTS baseline_wpm NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS last_assessed_at TIMESTAMPTZ;

-- Also fix the remaining policies in 003 that still use the recursive join pattern
-- (assessment_attempts, exercise_attempts, typing_sessions, recommendations).
-- We reuse the helper functions created in the previous migration.

DROP POLICY IF EXISTS "assessment_attempts_select" ON public.assessment_attempts;
CREATE POLICY "assessment_attempts_select" ON public.assessment_attempts
  FOR SELECT TO authenticated
  USING (
    auth.uid() = student_id
    OR auth.jwt()->>'role' = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.student_id = assessment_attempts.student_id
        AND public.is_teacher_of_class(cm.class_id)
    )
  );

DROP POLICY IF EXISTS "exercise_attempts_select" ON public.exercise_attempts;
CREATE POLICY "exercise_attempts_select" ON public.exercise_attempts
  FOR SELECT TO authenticated
  USING (
    auth.uid() = student_id
    OR auth.jwt()->>'role' = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.student_id = exercise_attempts.student_id
        AND public.is_teacher_of_class(cm.class_id)
    )
  );

DROP POLICY IF EXISTS "typing_sessions_select" ON public.typing_sessions;
CREATE POLICY "typing_sessions_select" ON public.typing_sessions
  FOR SELECT TO authenticated
  USING (
    auth.uid() = student_id
    OR auth.jwt()->>'role' = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.student_id = typing_sessions.student_id
        AND public.is_teacher_of_class(cm.class_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.parent_student_links
      WHERE student_id = typing_sessions.student_id
        AND parent_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "recommendations_select" ON public.recommendations;
CREATE POLICY "recommendations_select" ON public.recommendations
  FOR SELECT TO authenticated
  USING (
    auth.uid() = student_id
    OR auth.jwt()->>'role' = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.student_id = recommendations.student_id
        AND public.is_teacher_of_class(cm.class_id)
    )
  );
