// ============================================================
// ICT Dojo — Core Platform Types
// Domain-agnostic. Typing-specific types live in domains/typing/types/
// ============================================================

// ------------------------------------------------------------
// Enums (mirrored from Supabase DB enums)
// ------------------------------------------------------------

export type UserRole = 'student' | 'teacher' | 'parent' | 'admin';

export type MasteryLevel = 'not_started' | 'weak' | 'developing' | 'strong' | 'mastered';

export type DependencyType =
  | 'prerequisite_of'
  | 'depends_on'
  | 'related_to'
  | 'builds_upon'
  | 'reinforces'
  | 'advanced_version_of';

export type AssessmentStatus = 'not_started' | 'in_progress' | 'completed' | 'abandoned';

export type CompletionStatus = 'completed' | 'partial' | 'abandoned';

// ------------------------------------------------------------
// User & Profile
// ------------------------------------------------------------

export interface Profile {
  id: string;
  role: UserRole;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentProfile {
  id: string;
  grade_level: number | null; // 1–12
  birth_year: number | null;
  xp_total: number;
  platform_level: number;
  created_at: string;
}

export interface TeacherProfile {
  id: string;
  school_id: string | null;
  created_at: string;
}

export interface School {
  id: string;
  name: string;
  created_at: string;
}

// ------------------------------------------------------------
// Learning Domain
// ------------------------------------------------------------

export interface LearningDomain {
  id: string;
  slug: string; // 'typing' | 'programming' | 'cs'
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

// ------------------------------------------------------------
// Skill Graph
// ------------------------------------------------------------

export interface Skill {
  id: string;
  domain_id: string;
  parent_skill_id: string | null;
  slug: string;
  name: string;
  description: string | null;
  grade_level_min: number | null;
  grade_level_max: number | null;
  difficulty_baseline: number;
  is_active: boolean;
  /** Domain-specific metadata — typed per domain in domain type files */
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SkillDependency {
  from_skill_id: string;
  to_skill_id: string;
  relationship: DependencyType;
}

/** Skill with its children pre-loaded (for skill tree views) */
export interface SkillWithChildren extends Skill {
  children: SkillWithChildren[];
}

// ------------------------------------------------------------
// Mastery
// ------------------------------------------------------------

export interface SkillMastery {
  id: string;
  student_id: string;
  skill_id: string;
  mastery_level: MasteryLevel;
  mastery_score: number; // 0–100
  last_practiced_at: string | null;
  practice_count: number;
  updated_at: string;
}

export interface MasteryHistory {
  id: string;
  student_id: string;
  skill_id: string;
  mastery_score: number;
  mastery_level: MasteryLevel;
  recorded_at: string;
}

/** Belt levels: 0=White 1=Yellow 2=Orange 3=Green 4=Blue 5=Purple 6=Brown 7=Black */
export type BeltLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const BELT_NAMES: Record<BeltLevel, string> = {
  0: 'White',
  1: 'Yellow',
  2: 'Orange',
  3: 'Green',
  4: 'Blue',
  5: 'Purple',
  6: 'Brown',
  7: 'Black',
};

export interface DomainProgression {
  id: string;
  student_id: string;
  domain_id: string;
  belt_level: BeltLevel;
  domain_xp: number;
  updated_at: string;
}

// ------------------------------------------------------------
// Assessment
// ------------------------------------------------------------

export interface Assessment {
  id: string;
  domain_id: string;
  name: string;
  description: string | null;
  grade_level_min: number | null;
  grade_level_max: number | null;
  is_diagnostic: boolean;
  /** Domain-specific config — e.g. stages for typing diagnostic */
  metadata: Record<string, unknown>;
}

export interface AssessmentAttempt {
  id: string;
  student_id: string;
  assessment_id: string;
  status: AssessmentStatus;
  started_at: string;
  completed_at: string | null;
  /** Domain-specific results — typed in domain files */
  raw_results: Record<string, unknown>;
}

// ------------------------------------------------------------
// Exercises
// ------------------------------------------------------------

export interface Exercise {
  id: string;
  domain_id: string;
  skill_ids: string[];
  title: string | null;
  difficulty: number;
  difficulty_metadata: Record<string, unknown>;
  /** Domain-specific content — typed in domain files */
  content: Record<string, unknown>;
  is_ai_generated: boolean;
  grade_level_min: number | null;
  grade_level_max: number | null;
  created_at: string;
}

export interface ExerciseAttempt {
  id: string;
  student_id: string;
  exercise_id: string;
  skill_ids: string[];
  started_at: string;
  completed_at: string | null;
  completion_status: CompletionStatus | null;
  score: number | null;
  /** Domain-specific performance data — typed in domain files */
  raw_performance: Record<string, unknown>;
}

// ------------------------------------------------------------
// Recommendations
// ------------------------------------------------------------

export interface Recommendation {
  id: string;
  student_id: string;
  domain_id: string;
  recommended_skill_id: string | null;
  recommended_exercise_id: string | null;
  reason: string | null;
  priority: number;
  is_acted_on: boolean;
  created_at: string;
}

// ------------------------------------------------------------
// Adaptive Engine — shared interfaces
// ------------------------------------------------------------

/**
 * Every domain evaluator must implement this interface.
 * Domain-specific input/output types are passed via generics.
 */
export interface IExerciseEvaluator<TInput, TResult> {
  evaluate(input: TInput): TResult;
}

export interface MasteryUpdateInput {
  studentId: string;
  skillId: string;
  newScore: number;
  newLevel: MasteryLevel;
}

export interface RecommendationInput {
  studentId: string;
  domainId: string;
  masteryMap: Map<string, SkillMastery>;
  skills: Skill[];
  dependencies: SkillDependency[];
  recentAttempts: ExerciseAttempt[];
}

// ------------------------------------------------------------
// API Response wrappers
// ------------------------------------------------------------

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
