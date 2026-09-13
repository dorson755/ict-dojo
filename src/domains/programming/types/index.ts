export type ProgrammingActivityType = 'multiple_choice' | 'output_prediction' | 'debugging';

export interface ProgrammingExerciseContent {
  activityType: ProgrammingActivityType;
  prompt: string;
  code?: string;
  choices: string[];
  correctAnswer: string;
  explanation: string;
}

export interface ProgrammingAttempt {
  selectedAnswer: string;
  completedAt: number;
}

export interface ProgrammingResult {
  correct: boolean;
  score: number;
  explanation: string;
}
