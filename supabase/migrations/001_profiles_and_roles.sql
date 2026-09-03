-- ============================================================
-- Migration: 001 — Roles, Profiles, Schools
-- ============================================================

-- Enums
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'parent', 'admin');
CREATE TYPE mastery_level AS ENUM ('not_started', 'weak', 'developing', 'strong', 'mastered');
CREATE TYPE dependency_type AS ENUM (
  'prerequisite_of', 'depends_on', 'related_to',
  'builds_upon', 'reinforces', 'advanced_version_of'
);
CREATE TYPE assessment_status AS ENUM ('not_started', 'in_progress', 'completed', 'abandoned');

-- Schools (referenced by teacher_profiles)
CREATE TABLE public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles — extends auth.users for all roles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student profiles
CREATE TABLE public.student_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  grade_level SMALLINT CHECK (grade_level BETWEEN 1 AND 12),
  birth_year SMALLINT,
  xp_total INTEGER DEFAULT 0 CHECK (xp_total >= 0),
  platform_level SMALLINT DEFAULT 1 CHECK (platform_level >= 1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teacher profiles
CREATE TABLE public.teacher_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parent profiles
CREATE TABLE public.parent_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parent ↔ Student relationship
CREATE TABLE public.parent_student_links (
  parent_id UUID NOT NULL REFERENCES public.parent_profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (parent_id, student_id)
);

-- Classes
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id),
  name TEXT NOT NULL,
  grade_level SMALLINT CHECK (grade_level BETWEEN 1 AND 12),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Class members
CREATE TABLE public.class_members (
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (class_id, student_id)
);

-- Auto-update updated_at on profiles
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile + student_profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, display_name)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );

  -- Create role-specific profile row automatically for students
  IF COALESCE((NEW.raw_user_meta_data->>'role'), 'student') = 'student' THEN
    INSERT INTO public.student_profiles (id) VALUES (NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;

-- Profiles: users see their own row; admins see all
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id OR (SELECT auth.jwt()->>'role') = 'admin');

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- Student profiles: own row or their teacher/parent
CREATE POLICY "student_profiles_select" ON public.student_profiles
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = id
    OR (SELECT auth.jwt()->>'role') = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.class_members cm
      JOIN public.classes c ON c.id = cm.class_id
      WHERE cm.student_id = student_profiles.id
        AND c.teacher_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.parent_student_links
      WHERE student_id = student_profiles.id
        AND parent_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "student_profiles_update_own" ON public.student_profiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- Schools: anyone authenticated can read
CREATE POLICY "schools_select" ON public.schools
  FOR SELECT TO authenticated USING (true);

-- Classes: teachers see their own classes; students/parents see classes they're in
CREATE POLICY "classes_select" ON public.classes
  FOR SELECT TO authenticated
  USING (
    teacher_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.class_members
      WHERE class_id = classes.id AND student_id = (SELECT auth.uid())
    )
    OR (SELECT auth.jwt()->>'role') = 'admin'
  );

CREATE POLICY "classes_insert_teacher" ON public.classes
  FOR INSERT TO authenticated
  WITH CHECK (
    teacher_id = (SELECT auth.uid())
    AND (SELECT auth.jwt()->>'role') = 'teacher'
  );

-- Class members: visible to teacher of the class and the student themselves
CREATE POLICY "class_members_select" ON public.class_members
  FOR SELECT TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.classes
      WHERE id = class_members.class_id AND teacher_id = (SELECT auth.uid())
    )
    OR (SELECT auth.jwt()->>'role') = 'admin'
  );
