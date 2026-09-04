-- Create SECURITY DEFINER functions to bypass RLS and avoid infinite recursion
CREATE OR REPLACE FUNCTION public.is_teacher_of_class(c_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.classes WHERE id = c_id AND teacher_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_student_in_class(c_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.class_members WHERE class_id = c_id AND student_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop the old recursive policies
DROP POLICY IF EXISTS "classes_select" ON public.classes;
DROP POLICY IF EXISTS "class_members_select" ON public.class_members;
DROP POLICY IF EXISTS "student_profiles_select" ON public.student_profiles;
DROP POLICY IF EXISTS "skill_mastery_select" ON public.skill_mastery;
DROP POLICY IF EXISTS "mastery_history_select" ON public.mastery_history;
DROP POLICY IF EXISTS "domain_progression_select" ON public.domain_progression;

-- Recreate policies using the new functions to break the infinite recursion cycle
CREATE POLICY "classes_select" ON public.classes
  FOR SELECT TO authenticated
  USING (
    teacher_id = auth.uid()
    OR public.is_student_in_class(id)
    OR auth.jwt()->>'role' = 'admin'
  );

CREATE POLICY "class_members_select" ON public.class_members
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR public.is_teacher_of_class(class_id)
    OR auth.jwt()->>'role' = 'admin'
  );

CREATE POLICY "student_profiles_select" ON public.student_profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR auth.jwt()->>'role' = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.student_id = student_profiles.id
        AND public.is_teacher_of_class(cm.class_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.parent_student_links
      WHERE student_id = student_profiles.id
        AND parent_id = auth.uid()
    )
  );

CREATE POLICY "skill_mastery_select" ON public.skill_mastery
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR auth.jwt()->>'role' = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.student_id = skill_mastery.student_id
        AND public.is_teacher_of_class(cm.class_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.parent_student_links
      WHERE student_id = skill_mastery.student_id
        AND parent_id = auth.uid()
    )
  );

CREATE POLICY "mastery_history_select" ON public.mastery_history
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR auth.jwt()->>'role' = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.student_id = mastery_history.student_id
        AND public.is_teacher_of_class(cm.class_id)
    )
  );

CREATE POLICY "domain_progression_select" ON public.domain_progression
  FOR SELECT TO authenticated
  USING (
    auth.uid() = student_id
    OR auth.jwt()->>'role' = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.student_id = domain_progression.student_id
        AND public.is_teacher_of_class(cm.class_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.parent_student_links
      WHERE student_id = domain_progression.student_id
        AND parent_id = auth.uid()
    )
  );
