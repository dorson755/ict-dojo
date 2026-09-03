// ============================================================
// Supabase Database Types — Hand-authored to match migrations
// Run `npx supabase gen types typescript --project-id <id>` to regenerate
// when you have a live Supabase project wired up.
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'student' | 'teacher' | 'admin' | 'parent';
export type MasteryLevel = 'not_started' | 'weak' | 'developing' | 'strong' | 'mastered';
export type DomainProgressionStatus = 'not_started' | 'active' | 'completed' | 'paused';
export type AssessmentType = 'diagnostic' | 'formative' | 'summative' | 'practice';
export type AssessmentStatus = 'pending' | 'in_progress' | 'completed' | 'abandoned';
export type RelationshipType = 'prerequisite_of' | 'related_to' | 'part_of';

// ============================================================
// Row types
// ============================================================

export interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface StudentProfileRow {
  id: string;
  grade_level: number | null;
  age: number | null;
  school_id: string | null;
  teacher_id: string | null;
  preferences: Json;
  created_at: string;
  updated_at: string;
}

export interface LearningDomainRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface SkillRow {
  id: string;
  domain_id: string;
  parent_skill_id: string | null;
  slug: string;
  name: string;
  description: string | null;
  grade_level_min: number;
  grade_level_max: number;
  difficulty_baseline: number;
  metadata: Json;
  is_active: boolean;
  created_at: string;
}

export interface SkillDependencyRow {
  id: string;
  from_skill_id: string;
  to_skill_id: string;
  relationship: RelationshipType;
}

export interface SkillMasteryRow {
  id: string;
  student_id: string;
  skill_id: string;
  domain_id: string;
  mastery_score: number;
  mastery_level: MasteryLevel;
  practice_count: number;
  last_practiced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MasteryHistoryRow {
  id: string;
  student_id: string;
  skill_id: string;
  previous_score: number;
  new_score: number;
  assessment_source_id: string | null;
  source_type: string | null;
  created_at: string;
}

export interface DomainProgressionRow {
  id: string;
  student_id: string;
  domain_id: string;
  status: DomainProgressionStatus;
  overall_score: number | null;
  started_at: string;
  completed_at: string | null;
}

export interface ExerciseRow {
  id: string;
  domain_id: string;
  skill_ids: string[];
  title: string;
  difficulty: number;
  difficulty_metadata: Json;
  content: {
    passage: string;
    hint?: string;
    target_skill_slugs?: string[];
  };
  grade_level_min: number;
  grade_level_max: number;
  is_active: boolean;
  created_at: string;
}

export interface AssessmentRow {
  id: string;
  domain_id: string;
  assessment_type: AssessmentType;
  title: string;
  description: string | null;
  grade_level_min: number;
  grade_level_max: number;
  config: Json;
  is_active: boolean;
  created_at: string;
}

export interface AssessmentAttemptRow {
  id: string;
  assessment_id: string;
  student_id: string;
  status: AssessmentStatus;
  started_at: string;
  completed_at: string | null;
  results: Json;
  created_at: string;
}

export interface TypingSessionRow {
  id: string;
  student_id: string;
  exercise_id: string | null;
  assessment_attempt_id: string | null;
  wpm: number;
  accuracy: number;
  chars_attempted: number;
  chars_correct: number;
  backspaces: number;
  duration_ms: number;
  error_locations: Json;
  hesitation_events: Json;
  composite_score: number | null;
  created_at: string;
}

export interface TypingDnaRow {
  id: string;
  student_id: string;
  baseline_wpm: number | null;
  peak_wpm: number | null;
  avg_accuracy: number | null;
  weak_key_pairs: Json;
  last_assessed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecommendationRow {
  id: string;
  student_id: string;
  domain_id: string | null;
  recommended_skill_id: string | null;
  recommended_exercise_id: string | null;
  reason: string | null;
  priority: number;
  is_acted_on: boolean;
  created_at: string;
}

// ============================================================
// Database type shape expected by @supabase/supabase-js
// Each table entry requires Row, Insert, Update, and Relationships.
// ============================================================

type TableDef<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<ProfileRow, Omit<ProfileRow, 'created_at' | 'updated_at'> & { id: string }>;
      student_profiles: TableDef<StudentProfileRow, { id: string } & Partial<StudentProfileRow>>;
      learning_domains: TableDef<LearningDomainRow, Partial<LearningDomainRow>>;
      skills: TableDef<SkillRow, Partial<SkillRow>>;
      skill_dependencies: TableDef<SkillDependencyRow, Partial<SkillDependencyRow>>;
      skill_mastery: TableDef<
        SkillMasteryRow,
        { student_id: string; skill_id: string; domain_id: string } & Partial<SkillMasteryRow>
      >;
      mastery_history: TableDef<
        MasteryHistoryRow,
        { student_id: string; skill_id: string } & Partial<MasteryHistoryRow>
      >;
      domain_progression: TableDef<
        DomainProgressionRow,
        { student_id: string; domain_id: string } & Partial<DomainProgressionRow>
      >;
      exercises: TableDef<ExerciseRow, Partial<ExerciseRow>>;
      assessments: TableDef<AssessmentRow, Partial<AssessmentRow>>;
      assessment_attempts: TableDef<
        AssessmentAttemptRow,
        { assessment_id: string; student_id: string } & Partial<AssessmentAttemptRow>
      >;
      typing_sessions: TableDef<TypingSessionRow, { student_id: string } & Partial<TypingSessionRow>>;
      typing_dna: TableDef<TypingDnaRow, { student_id: string } & Partial<TypingDnaRow>>;
      recommendations: TableDef<
        RecommendationRow,
        { student_id: string } & Partial<RecommendationRow>
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      mastery_level: MasteryLevel;
      domain_progression_status: DomainProgressionStatus;
      assessment_type: AssessmentType;
      assessment_status: AssessmentStatus;
    };
  };
}
