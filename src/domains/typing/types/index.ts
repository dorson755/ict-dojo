// ============================================================
// ICT Dojo — Typing Domain Types
// All typing-specific types. Domain-agnostic types live in src/types/platform.ts
// ============================================================

// ------------------------------------------------------------
// Exercise content shape (stored in exercises.content JSONB)
// ------------------------------------------------------------

export interface TypingExerciseContent {
  passage: string;
  /** Display hint for the student (e.g. "Focus on home row keys") */
  hint?: string;
  /** Skills this passage specifically targets */
  target_skill_slugs?: string[];
}

// ------------------------------------------------------------
// Difficulty metadata shape (exercises.difficulty_metadata JSONB)
// ------------------------------------------------------------

export interface TypingDifficultyMetadata {
  word_length_avg: number;
  sentence_length_avg: number;
  has_punctuation: boolean;
  has_capitalization: boolean;
  has_numbers: boolean;
  has_symbols: boolean;
  has_code_chars: boolean;
  uncommon_combinations: number; // 0–10 scale
  target_wpm?: number;
  passage_length: number; // characters
  vocabulary_level: 'basic' | 'intermediate' | 'advanced' | 'technical';
}

// ------------------------------------------------------------
// Keystroke event (captured client-side during session)
// ------------------------------------------------------------

export interface KeystrokeEvent {
  /** Index in the target passage */
  position: number;
  /** Expected character at this position */
  expected: string;
  /** Character the student actually typed */
  actual: string;
  /** Whether the character was correct */
  correct: boolean;
  /** Time since session start in ms */
  timestamp_ms: number;
}

// ------------------------------------------------------------
// Hesitation event (gap > threshold between keystrokes)
// ------------------------------------------------------------

export interface HesitationEvent {
  position: number;
  duration_ms: number;
}

// ------------------------------------------------------------
// Error location (stored in typing_sessions.error_locations)
// ------------------------------------------------------------

export interface ErrorLocation {
  position: number;
  expected: string;
  actual: string;
}

// ------------------------------------------------------------
// Key pair error (e.g. "er" → typed "re")
// ------------------------------------------------------------

export interface KeyPairError {
  pair: string; // e.g. "er"
  count: number;
  examples: string[]; // context windows
}

// ------------------------------------------------------------
// Typing Evaluator Input (what the client sends after a session)
// ------------------------------------------------------------

export interface TypingSessionInput {
  studentId: string;
  exerciseId: string;
  passage: string;
  keystrokes: KeystrokeEvent[];
  startedAt: number; // Unix ms
  completedAt: number; // Unix ms
  skillIds: string[];
}

// ------------------------------------------------------------
// Typing Evaluator Output (deterministic results)
// ------------------------------------------------------------

export interface TypingSessionResult {
  wpm: number;
  accuracy: number; // 0–100
  charsAttempted: number;
  charsCorrect: number;
  charsIncorrect: number;
  backspaces: number;
  durationMs: number;
  passageLength: number;
  difficultyScore: number;
  errorLocations: ErrorLocation[];
  keyPairErrors: KeyPairError[];
  hesitationEvents: HesitationEvent[];
  /** Composite score for mastery calculation: 0–100 */
  compositeScore: number;
  /** Whether the session constitutes a valid measurement */
  isValid: boolean;
  /** Reason if invalid */
  invalidReason?: string;
}

// ------------------------------------------------------------
// Typing DNA update delta (what changes after a session)
// ------------------------------------------------------------

export interface TypingDnaDelta {
  studentId: string;
  sessionResult: TypingSessionResult;
  passage: string;
}

// ------------------------------------------------------------
// Diagnostic assessment stages
// ------------------------------------------------------------

export type DiagnosticStage =
  | 'keyboard_familiarity'
  | 'letter_combinations'
  | 'words'
  | 'sentences'
  | 'passage';

export interface DiagnosticStageResult {
  stage: DiagnosticStage;
  attemptId: string;
  sessionResult: TypingSessionResult;
  skillsAssessed: string[];
}

export interface DiagnosticAssessmentResult {
  assessmentAttemptId: string;
  studentId: string;
  gradeLevel: number;
  stages: DiagnosticStageResult[];
  /** Initial mastery levels derived from diagnostic */
  initialMastery: Record<string, { score: number; level: string }>;
  completedAt: string;
}
