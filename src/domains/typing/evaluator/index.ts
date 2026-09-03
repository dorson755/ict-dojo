import { IExerciseEvaluator } from '@/types/platform';
import {
  TypingSessionInput,
  TypingSessionResult,
  ErrorLocation,
  KeyPairError,
  HesitationEvent,
} from '../types';

/**
 * Deterministic evaluator for Typing Domain exercises.
 * Calculates WPM, Accuracy, and analyzes error patterns/hesitations.
 */
export class TypingEvaluator
  implements IExerciseEvaluator<TypingSessionInput, TypingSessionResult>
{
  /**
   * Words Per Minute (WPM) calculation standard: 5 characters = 1 word.
   * Based on total duration, not just active typing time.
   */
  private calculateWpm(charsCorrect: number, durationMs: number): number {
    if (durationMs === 0) return 0;
    const durationMinutes = durationMs / 1000 / 60;
    const words = charsCorrect / 5;
    return Math.max(0, Number((words / durationMinutes).toFixed(2)));
  }

  /**
   * Accuracy calculation: (Correct / Attempted) * 100
   */
  private calculateAccuracy(charsCorrect: number, charsAttempted: number): number {
    if (charsAttempted === 0) return 0;
    return Math.max(0, Number(((charsCorrect / charsAttempted) * 100).toFixed(2)));
  }

  public evaluate(input: TypingSessionInput): TypingSessionResult {
    const { passage, keystrokes, startedAt, completedAt } = input;

    // 1. Base Metrics
    const durationMs = completedAt - startedAt;
    const passageLength = passage.length;
    const charsAttempted = keystrokes.length;
    
    // We count a character as "correct" if the *final* keystroke for a position was correct.
    // If a user typed wrong, backspaced, and typed correct, it's correct but backspaces > 0.
    // To do this simply from a flat event log, we group by position.
    
    const keystrokesByPosition = new Map<number, typeof keystrokes>();
    for (const k of keystrokes) {
      if (!keystrokesByPosition.has(k.position)) {
        keystrokesByPosition.set(k.position, []);
      }
      keystrokesByPosition.get(k.position)!.push(k);
    }

    let charsCorrect = 0;
    let charsIncorrect = 0;
    let backspaces = 0;
    const errorLocations: ErrorLocation[] = [];
    const keyPairErrorMap = new Map<string, number>();

    for (let pos = 0; pos < passageLength; pos++) {
      const eventsForPos = keystrokesByPosition.get(pos);
      if (!eventsForPos || eventsForPos.length === 0) continue;

      // Count backspaces for this position (any attempt before the final one)
      if (eventsForPos.length > 1) {
        backspaces += (eventsForPos.length - 1);
      }

      const finalEvent = eventsForPos[eventsForPos.length - 1];
      
      if (finalEvent.correct) {
        charsCorrect++;
      } else {
        charsIncorrect++;
        errorLocations.push({
          position: pos,
          expected: finalEvent.expected,
          actual: finalEvent.actual,
        });

        // Record pair error (e.g., expected 'a', typed 's' -> pair 'as')
        const pair = `${finalEvent.expected}${finalEvent.actual}`;
        keyPairErrorMap.set(pair, (keyPairErrorMap.get(pair) || 0) + 1);
      }
    }

    const keyPairErrors: KeyPairError[] = Array.from(keyPairErrorMap.entries()).map(
      ([pair, count]) => ({
        pair,
        count,
        examples: [], // Context population can be enhanced later
      })
    );

    // 2. Calculated Metrics
    const wpm = this.calculateWpm(charsCorrect, durationMs);
    const accuracy = this.calculateAccuracy(charsCorrect, charsAttempted);

    // 3. Hesitation Analysis (gaps > 500ms between keystrokes)
    const hesitationEvents: HesitationEvent[] = [];
    const HESITATION_THRESHOLD_MS = 500;
    
    for (let i = 1; i < keystrokes.length; i++) {
       const gap = keystrokes[i].timestamp_ms - keystrokes[i-1].timestamp_ms;
       if (gap > HESITATION_THRESHOLD_MS) {
           hesitationEvents.push({
               position: keystrokes[i].position,
               duration_ms: gap
           });
       }
    }

    // 4. Validity checks
    // Session is invalid if less than 10 chars typed, or duration is too short/long
    const isValid = charsAttempted >= 10 && durationMs > 1000 && durationMs < 1000 * 60 * 30; // Max 30 mins
    let invalidReason: string | undefined;
    if (!isValid) {
      if (charsAttempted < 10) invalidReason = 'Session too short (under 10 keystrokes).';
      else if (durationMs <= 1000) invalidReason = 'Session too short (under 1 second).';
      else if (durationMs >= 1000 * 60 * 30) invalidReason = 'Session too long (over 30 mins).';
    }

    // 5. Composite Score (0-100)
    // A blend of accuracy and speed progress. (Basic implementation for MVP)
    // Real implementation would compare against grade-level baseline
    const compositeScore = Math.max(0, Math.min(100, (accuracy * 0.7) + (Math.min(wpm, 100) * 0.3)));

    return {
      wpm,
      accuracy,
      charsAttempted,
      charsCorrect,
      charsIncorrect,
      backspaces,
      durationMs,
      passageLength,
      difficultyScore: 1.0, // To be populated from exercise metadata
      errorLocations,
      keyPairErrors,
      hesitationEvents,
      compositeScore: Number(compositeScore.toFixed(2)),
      isValid,
      invalidReason
    };
  }
}
