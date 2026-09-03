-- ============================================================
-- Migration: 002 — Learning Domains, Skills, Mastery
-- ============================================================

-- Learning Domains (domain-agnostic)
CREATE TABLE public.learning_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order SMALLINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skills (hierarchical, domain-agnostic)
CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID NOT NULL REFERENCES public.learning_domains(id) ON DELETE CASCADE,
  parent_skill_id UUID REFERENCES public.skills(id) ON DELETE SET NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  grade_level_min SMALLINT CHECK (grade_level_min BETWEEN 1 AND 12),
  grade_level_max SMALLINT CHECK (grade_level_max BETWEEN 1 AND 12),
  difficulty_baseline NUMERIC(4,2) DEFAULT 1.0 CHECK (difficulty_baseline > 0),
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(domain_id, slug),
  CHECK (grade_level_min <= grade_level_max)
);

-- Skill dependency graph
CREATE TABLE public.skill_dependencies (
  from_skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  to_skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  relationship dependency_type NOT NULL,
  PRIMARY KEY (from_skill_id, to_skill_id, relationship),
  CHECK (from_skill_id != to_skill_id)
);

-- Mastery per student per skill
CREATE TABLE public.skill_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  mastery_level mastery_level NOT NULL DEFAULT 'not_started',
  mastery_score NUMERIC(5,2) DEFAULT 0 CHECK (mastery_score BETWEEN 0 AND 100),
  last_practiced_at TIMESTAMPTZ,
  practice_count INTEGER DEFAULT 0 CHECK (practice_count >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, skill_id)
);

CREATE TRIGGER skill_mastery_updated_at
  BEFORE UPDATE ON public.skill_mastery
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Full mastery history (append-only audit trail)
CREATE TABLE public.mastery_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  mastery_score NUMERIC(5,2) CHECK (mastery_score BETWEEN 0 AND 100),
  mastery_level mastery_level,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Domain progression (belt/XP per student per domain)
CREATE TABLE public.domain_progression (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  domain_id UUID NOT NULL REFERENCES public.learning_domains(id) ON DELETE CASCADE,
  belt_level SMALLINT DEFAULT 0 CHECK (belt_level BETWEEN 0 AND 7),
  domain_xp INTEGER DEFAULT 0 CHECK (domain_xp >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, domain_id)
);

CREATE TRIGGER domain_progression_updated_at
  BEFORE UPDATE ON public.domain_progression
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes for performance
CREATE INDEX idx_skills_domain ON public.skills(domain_id);
CREATE INDEX idx_skills_parent ON public.skills(parent_skill_id);
CREATE INDEX idx_skill_deps_from ON public.skill_dependencies(from_skill_id);
CREATE INDEX idx_skill_deps_to ON public.skill_dependencies(to_skill_id);
CREATE INDEX idx_skill_mastery_student ON public.skill_mastery(student_id);
CREATE INDEX idx_skill_mastery_skill ON public.skill_mastery(skill_id);
CREATE INDEX idx_mastery_history_student ON public.mastery_history(student_id);
CREATE INDEX idx_mastery_history_skill ON public.mastery_history(skill_id);
CREATE INDEX idx_domain_progression_student ON public.domain_progression(student_id);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.learning_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastery_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_progression ENABLE ROW LEVEL SECURITY;

-- Domains and skills are read-only for all authenticated users
CREATE POLICY "domains_select_all" ON public.learning_domains
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "skills_select_all" ON public.skills
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "skill_deps_select_all" ON public.skill_dependencies
  FOR SELECT TO authenticated USING (true);

-- Mastery: students see own; teachers see their class; parents see their children
CREATE POLICY "skill_mastery_select" ON public.skill_mastery
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = student_id
    OR (SELECT auth.jwt()->>'role') = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.class_members cm
      JOIN public.classes c ON c.id = cm.class_id
      WHERE cm.student_id = skill_mastery.student_id
        AND c.teacher_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.parent_student_links
      WHERE student_id = skill_mastery.student_id
        AND parent_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "skill_mastery_upsert_own" ON public.skill_mastery
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = student_id)
  WITH CHECK ((SELECT auth.uid()) = student_id);

CREATE POLICY "mastery_history_select" ON public.mastery_history
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = student_id
    OR (SELECT auth.jwt()->>'role') = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.class_members cm
      JOIN public.classes c ON c.id = cm.class_id
      WHERE cm.student_id = mastery_history.student_id
        AND c.teacher_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "mastery_history_insert_own" ON public.mastery_history
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = student_id);

CREATE POLICY "domain_progression_select" ON public.domain_progression
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = student_id
    OR (SELECT auth.jwt()->>'role') = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.class_members cm
      JOIN public.classes c ON c.id = cm.class_id
      WHERE cm.student_id = domain_progression.student_id
        AND c.teacher_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.parent_student_links
      WHERE student_id = domain_progression.student_id
        AND parent_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "domain_progression_upsert_own" ON public.domain_progression
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = student_id)
  WITH CHECK ((SELECT auth.uid()) = student_id);
