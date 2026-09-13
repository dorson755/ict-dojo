import type { IExerciseEvaluator } from '@/types/platform';
import type {
  ProgrammingAttempt,
  ProgrammingExerciseContent,
  ProgrammingResult,
} from '../types';

export class ProgrammingEvaluator
  implements IExerciseEvaluator<{ exercise: ProgrammingExerciseContent; attempt: ProgrammingAttempt }, ProgrammingResult> {
  evaluate({ exercise, attempt }: { exercise: ProgrammingExerciseContent; attempt: ProgrammingAttempt }): ProgrammingResult {
    const correct = attempt.selectedAnswer === exercise.correctAnswer;
    return { correct, score: correct ? 100 : 0, explanation: exercise.explanation };
  }
}
