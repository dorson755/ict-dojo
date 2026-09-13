import { ProgrammingEvaluator } from '../index';

describe('ProgrammingEvaluator', () => {
  const evaluator = new ProgrammingEvaluator();
  const exercise = {
    activityType: 'output_prediction' as const,
    prompt: 'What value is printed?',
    code: 'let count = 2;\ncount = count + 3;\nconsole.log(count);',
    choices: ['2', '3', '5', '23'],
    correctAnswer: '5',
    explanation: 'The second line adds 3 to the original value of 2.',
  };

  it('scores a correct output prediction', () => {
    expect(evaluator.evaluate({ exercise, attempt: { selectedAnswer: '5', completedAt: 1 } }))
      .toEqual({ correct: true, score: 100, explanation: exercise.explanation });
  });

  it('scores an incorrect output prediction', () => {
    expect(evaluator.evaluate({ exercise, attempt: { selectedAnswer: '3', completedAt: 1 } }).score)
      .toBe(0);
  });
});
