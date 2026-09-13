'use client';

import { useState } from 'react';
import { ProgrammingEvaluator } from '@/domains/programming/evaluator';
import type { ProgrammingExerciseContent, ProgrammingResult } from '@/domains/programming/types';

const exercise: ProgrammingExerciseContent = {
  activityType: 'output_prediction',
  prompt: 'What does this program print?',
  code: 'count = 2\ncount = count + 3\nprint(count)',
  choices: ['2', '3', '5', '23'],
  correctAnswer: '5',
  explanation: 'The variable starts at 2. The next line adds 3, so the final value is 5.',
};

export default function ProgrammingClient() {
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [result, setResult] = useState<ProgrammingResult | null>(null);

  const submit = () => {
    if (!selectedAnswer) return;
    setResult(new ProgrammingEvaluator().evaluate({
      exercise,
      attempt: { selectedAnswer, completedAt: Date.now() },
    }));
  };

  return (
    <section className="card stack gap-4">
      <p className="text-muted">{exercise.prompt}</p>
      <pre className="card-flat text-mono">{exercise.code}</pre>
      <div className="stack gap-2">
        {exercise.choices.map((choice) => (
          <button
            key={choice}
            className={`btn ${selectedAnswer === choice ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedAnswer(choice)}
          >
            {choice}
          </button>
        ))}
      </div>
      <button className="btn btn-primary" disabled={!selectedAnswer} onClick={submit}>Check answer</button>
      {result && <p className={result.correct ? 'pill pill-success' : 'pill pill-danger'}>{result.explanation}</p>}
    </section>
  );
}
