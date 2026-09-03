import { TypingEvaluator } from '../index';
import { TypingSessionInput, KeystrokeEvent } from '../../types';

describe('TypingEvaluator', () => {
  let evaluator: TypingEvaluator;

  beforeEach(() => {
    evaluator = new TypingEvaluator();
  });

  it('calculates perfect session metrics correctly', () => {
    const passage = 'hello world';
    const startedAt = 1000;
    const completedAt = 6000; // 5 seconds duration
    const keystrokes: KeystrokeEvent[] = passage.split('').map((char, index) => ({
      position: index,
      expected: char,
      actual: char,
      correct: true,
      timestamp_ms: startedAt + index * 400,
    }));

    const input: TypingSessionInput = {
      studentId: 'test-student',
      exerciseId: 'test-exercise',
      passage,
      keystrokes,
      startedAt,
      completedAt,
      skillIds: [],
    };

    const result = evaluator.evaluate(input);

    expect(result.isValid).toBe(true);
    expect(result.charsAttempted).toBe(11);
    expect(result.charsCorrect).toBe(11);
    expect(result.charsIncorrect).toBe(0);
    expect(result.accuracy).toBe(100);
    // 11 chars = 2.2 words. 5 seconds = 0.08333 mins. WPM = 2.2 / 0.08333 = 26.4
    expect(result.wpm).toBeCloseTo(26.4, 1);
    expect(result.errorLocations.length).toBe(0);
    expect(result.backspaces).toBe(0);
    expect(result.hesitationEvents.length).toBe(0);
  });

  it('handles errors and backspaces correctly', () => {
    const passage = 'test';
    const startedAt = 1000;
    const completedAt = 6000; // 5 seconds duration

    // User types 't', 'a' (wrong), backspaces, types 'e', 's', 't'
    const keystrokes: KeystrokeEvent[] = [
      { position: 0, expected: 't', actual: 't', correct: true, timestamp_ms: 1000 },
      { position: 1, expected: 'e', actual: 'a', correct: false, timestamp_ms: 1500 }, // Error
      { position: 1, expected: 'e', actual: 'e', correct: true, timestamp_ms: 2500 },  // Corrected (implicitly backspaced)
      { position: 2, expected: 's', actual: 's', correct: true, timestamp_ms: 3000 },
      { position: 3, expected: 't', actual: 't', correct: true, timestamp_ms: 3500 },
    ];

    const input: TypingSessionInput = {
      studentId: 'test-student',
      exerciseId: 'test-exercise',
      passage,
      keystrokes,
      startedAt,
      completedAt,
      skillIds: [],
    };

    const result = evaluator.evaluate(input);

    expect(result.charsAttempted).toBe(5);
    expect(result.charsCorrect).toBe(4); // Finally correct
    expect(result.charsIncorrect).toBe(0); // The final state of position 1 is correct
    expect(result.backspaces).toBe(1); // One extra attempt at position 1
    // Hesitation between 1500 and 2500 is 1000ms (> 500ms)
    expect(result.hesitationEvents.length).toBe(1);
    expect(result.hesitationEvents[0].position).toBe(1);
  });

  it('flags uncorrected errors', () => {
    const passage = 'test';
    const startedAt = 1000;
    const completedAt = 5000;

    // User types 't', 'a', 's', 't' (leaves the error)
    const keystrokes: KeystrokeEvent[] = [
      { position: 0, expected: 't', actual: 't', correct: true, timestamp_ms: 1000 },
      { position: 1, expected: 'e', actual: 'a', correct: false, timestamp_ms: 1500 }, // Uncorrected error
      { position: 2, expected: 's', actual: 's', correct: true, timestamp_ms: 2000 },
      { position: 3, expected: 't', actual: 't', correct: true, timestamp_ms: 2500 },
    ];

    const input: TypingSessionInput = {
      studentId: 'test-student',
      exerciseId: 'test-exercise',
      passage,
      keystrokes,
      startedAt,
      completedAt,
      skillIds: [],
    };

    const result = evaluator.evaluate(input);

    expect(result.charsCorrect).toBe(3);
    expect(result.charsIncorrect).toBe(1);
    expect(result.accuracy).toBe(75); // 3/4 * 100
    expect(result.errorLocations.length).toBe(1);
    expect(result.errorLocations[0].expected).toBe('e');
    expect(result.errorLocations[0].actual).toBe('a');
    expect(result.keyPairErrors[0].pair).toBe('ea');
  });

  it('marks sessions as invalid if too short', () => {
    const passage = 'hi';
    const startedAt = 1000;
    const completedAt = 1500;
    const keystrokes: KeystrokeEvent[] = [
      { position: 0, expected: 'h', actual: 'h', correct: true, timestamp_ms: 1100 },
      { position: 1, expected: 'i', actual: 'i', correct: true, timestamp_ms: 1200 },
    ];

    const input: TypingSessionInput = {
      studentId: 'test-student',
      exerciseId: 'test-exercise',
      passage,
      keystrokes,
      startedAt,
      completedAt,
      skillIds: [],
    };

    const result = evaluator.evaluate(input);
    expect(result.isValid).toBe(false);
    expect(result.invalidReason).toContain('Session too short (under 10 keystrokes)');
  });
});
