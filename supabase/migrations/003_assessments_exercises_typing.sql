-- ============================================================
-- Migration: 003 — Assessments, Exercises, Attempts, Typing
-- ============================================================

-- Assessments (domain-agnostic)
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID NOT NULL REFERENCES public.learning_domains(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  grade_level_min SMALLINT CHECK (grade_level_min BETWEEN 1 AND 12),
  grade_level_max SMALLINT CHECK (grade_level_max BETWEEN 1 AND 12),
  is_diagnostic BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (grade_level_min <= grade_level_max)
);

-- Assessment attempts
CREATE TABLE public.assessment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  status assessment_status DEFAULT 'not_started',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  raw_results JSONB DEFAULT '{}'
);

-- Exercises (domain-agnostic, content is JSONB)
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID NOT NULL REFERENCES public.learning_domains(id) ON DELETE CASCADE,
  skill_ids UUID[] DEFAULT '{}',
  title TEXT,
  difficulty NUMERIC(4,2) CHECK (difficulty > 0),
  difficulty_metadata JSONB DEFAULT '{}',
  content JSONB NOT NULL,
  is_ai_generated BOOLEAN DEFAULT FALSE,
  grade_level_min SMALLINT CHECK (grade_level_min BETWEEN 1 AND 12),
  grade_level_max SMALLINT CHECK (grade_level_max BETWEEN 1 AND 12),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (grade_level_min <= grade_level_max)
);

-- Exercise attempts
CREATE TABLE public.exercise_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  skill_ids UUID[] DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  completion_status TEXT CHECK (completion_status IN ('completed', 'partial', 'abandoned')),
  score NUMERIC(5,2) CHECK (score BETWEEN 0 AND 100),
  raw_performance JSONB DEFAULT '{}'
);

-- Typing-specific sessions (references exercise_attempts)
CREATE TABLE public.typing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.exercise_attempts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  wpm NUMERIC(6,2) CHECK (wpm >= 0),
  accuracy NUMERIC(5,2) CHECK (accuracy BETWEEN 0 AND 100),
  chars_attempted INTEGER CHECK (chars_attempted >= 0),
  chars_correct INTEGER CHECK (chars_correct >= 0),
  chars_incorrect INTEGER CHECK (chars_incorrect >= 0),
  backspaces INTEGER DEFAULT 0 CHECK (backspaces >= 0),
  error_locations JSONB DEFAULT '[]',
  key_pair_errors JSONB DEFAULT '[]',
  hesitation_events JSONB DEFAULT '[]',
  duration_ms INTEGER CHECK (duration_ms > 0),
  passage_length INTEGER CHECK (passage_length > 0),
  difficulty_score NUMERIC(4,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Typing DNA — evolving learner fingerprint (one row per student)
CREATE TABLE public.typing_dna (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  strong_keys JSONB DEFAULT '[]',
  weak_keys JSONB DEFAULT '[]',
  strong_combinations JSONB DEFAULT '[]',
  weak_combinations JSONB DEFAULT '[]',
  common_error_pairs JSONB DEFAULT '[]',
  avg_wpm NUMERIC(6,2),
  avg_accuracy NUMERIC(5,2),
  rhythm_score NUMERIC(4,2),
  hesitation_profile JSONB DEFAULT '{}',
  backspace_tendency NUMERIC(4,2),
  sessions_analyzed INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER typing_dna_updated_at
  BEFORE UPDATE ON public.typing_dna
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Recommendations (output of adaptive engine)
CREATE TABLE public.recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  domain_id UUID NOT NULL REFERENCES public.learning_domains(id) ON DELETE CASCADE,
  recommended_skill_id UUID REFERENCES public.skills(id) ON DELETE SET NULL,
  recommended_exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
  reason TEXT,
  priority SMALLINT DEFAULT 0,
  is_acted_on BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_assessment_attempts_student ON public.assessment_attempts(student_id);
CREATE INDEX idx_exercise_attempts_student ON public.exercise_attempts(student_id);
CREATE INDEX idx_exercise_attempts_exercise ON public.exercise_attempts(exercise_id);
CREATE INDEX idx_typing_sessions_student ON public.typing_sessions(student_id);
CREATE INDEX idx_typing_sessions_attempt ON public.typing_sessions(attempt_id);
CREATE INDEX idx_exercises_domain ON public.exercises(domain_id);
CREATE INDEX idx_exercises_grade ON public.exercises(grade_level_min, grade_level_max);
CREATE INDEX idx_recommendations_student ON public.recommendations(student_id, is_acted_on);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_dna ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

-- Assessments and exercises: read-only for all authenticated users
CREATE POLICY "assessments_select_all" ON public.assessments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "exercises_select_all" ON public.exercises
  FOR SELECT TO authenticated USING (true);

-- Assessment attempts: students see own; teachers see class; admins see all
CREATE POLICY "assessment_attempts_select" ON public.assessment_attempts
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = student_id
    OR (SELECT auth.jwt()->>'role') = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.class_members cm
      JOIN public.classes c ON c.id = cm.class_id
      WHERE cm.student_id = assessment_attempts.student_id
        AND c.teacher_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "assessment_attempts_insert_own" ON public.assessment_attempts
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = student_id);

CREATE POLICY "assessment_attempts_update_own" ON public.assessment_attempts
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = student_id)
  WITH CHECK ((SELECT auth.uid()) = student_id);

-- Exercise attempts: same pattern
CREATE POLICY "exercise_attempts_select" ON public.exercise_attempts
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = student_id
    OR (SELECT auth.jwt()->>'role') = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.class_members cm
      JOIN public.classes c ON c.id = cm.class_id
      WHERE cm.student_id = exercise_attempts.student_id
        AND c.teacher_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "exercise_attempts_insert_own" ON public.exercise_attempts
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = student_id);

CREATE POLICY "exercise_attempts_update_own" ON public.exercise_attempts
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = student_id)
  WITH CHECK ((SELECT auth.uid()) = student_id);

-- Typing sessions
CREATE POLICY "typing_sessions_select" ON public.typing_sessions
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = student_id
    OR (SELECT auth.jwt()->>'role') = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.class_members cm
      JOIN public.classes c ON c.id = cm.class_id
      WHERE cm.student_id = typing_sessions.student_id
        AND c.teacher_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.parent_student_links
      WHERE student_id = typing_sessions.student_id
        AND parent_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "typing_sessions_insert_own" ON public.typing_sessions
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = student_id);

-- Typing DNA: own only (privacy-sensitive)
CREATE POLICY "typing_dna_select_own" ON public.typing_dna
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = student_id
    OR (SELECT auth.jwt()->>'role') = 'admin'
  );

CREATE POLICY "typing_dna_upsert_own" ON public.typing_dna
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = student_id)
  WITH CHECK ((SELECT auth.uid()) = student_id);

-- Recommendations: students see own; teachers see class
CREATE POLICY "recommendations_select" ON public.recommendations
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = student_id
    OR (SELECT auth.jwt()->>'role') = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.class_members cm
      JOIN public.classes c ON c.id = cm.class_id
      WHERE cm.student_id = recommendations.student_id
        AND c.teacher_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "recommendations_insert_own" ON public.recommendations
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = student_id);

CREATE POLICY "recommendations_update_own" ON public.recommendations
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = student_id)
  WITH CHECK ((SELECT auth.uid()) = student_id);
