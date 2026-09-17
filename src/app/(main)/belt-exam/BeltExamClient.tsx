'use client';

import { useState } from 'react';
import Link from 'next/link';
import TypingEngine from '@/components/typing/TypingEngine';
import { submitBeltExam } from './actions';
import { TypingSessionInput, TypingSessionResult } from '@/domains/typing/types';
import styles from './belt-exam.module.css';

interface BeltExamClientProps {
  studentId: string;
  belt: number;
  beltName: string;
  passage: string;
  skillIds: string[];
  targets: { accuracy: number; wpm: number };
}

interface ExamOutcome {
  passed: boolean;
  wpm: number;
  accuracy: number;
  xpGained: number;
  newBeltName: string | null;
}

export default function BeltExamClient({
  studentId,
  belt,
  beltName,
  passage,
  skillIds,
  targets,
}: BeltExamClientProps) {
  const [outcome, setOutcome] = useState<ExamOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleComplete(sessionData: TypingSessionInput) {
    try {
      const response = await submitBeltExam(belt, sessionData);
      const result = response.result as TypingSessionResult;
      setOutcome({
        passed: response.passed,
        wpm: result.wpm,
        accuracy: result.accuracy,
        xpGained: 'xpGained' in response ? response.xpGained ?? 0 : 0,
        newBeltName: 'newBeltName' in response ? response.newBeltName ?? null : null,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'The exam could not be submitted.');
    }
  }

  if (error) {
    return (
      <main className={styles.page}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>Belt exam / {beltName}</p>
            <h1 className={styles.title}>Exam failed to submit.</h1>
            <p className={styles.subtitle}>{error}</p>
          </div>
          <Link className={styles.back} href="/dashboard">← Back to dashboard</Link>
        </header>
      </main>
    );
  }

  if (outcome) {
    return (
      <main className={styles.page}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>Belt exam / {beltName}</p>
            <h1 className={styles.title}>
              {outcome.passed ? 'Passed.' : 'Not this time.'}
            </h1>
            <p className={styles.subtitle}>
              {outcome.passed
                ? `Congratulations — ${outcome.newBeltName ?? beltName} Belt earned. Keep training for the next one.`
                : `The ${beltName} belt exam needs ${targets.accuracy}% accuracy and ${targets.wpm}+ WPM. Train the weak spots and try again.`}
            </p>
          </div>
          <Link className={styles.back} href="/dashboard">← Back to dashboard</Link>
        </header>

        <section className={styles.result}>
          <div className={styles.stats}>
            <div><span>WPM</span><strong>{outcome.wpm}</strong><em>target {targets.wpm}+</em></div>
            <div><span>Accuracy</span><strong>{outcome.accuracy}%</strong><em>target {targets.accuracy}%+</em></div>
            <div><span>Result</span><strong>{outcome.passed ? 'PASS' : 'FAIL'}</strong><em>{outcome.passed ? `+${outcome.xpGained} XP` : 'try again'}</em></div>
          </div>
          {outcome.passed ? (
            <Link className={styles.cta} href="/dashboard">See your new belt →</Link>
          ) : (
            <button className={styles.cta} onClick={() => setOutcome(null)}>
              Retake the exam
            </button>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Belt exam / {beltName}</p>
          <h1 className={styles.title}>{beltName} belt exam.</h1>
          <p className={styles.subtitle}>
            One shot, full focus. Pass requires {targets.accuracy}% accuracy and {targets.wpm}+ WPM.
          </p>
        </div>
        <Link className={styles.back} href="/dashboard">← Back to dashboard</Link>
      </header>

      <TypingEngine
        passage={passage}
        studentId={studentId}
        exerciseId={`belt-exam-${belt}`}
        skillIds={skillIds}
        onComplete={handleComplete}
        mode="accuracy"
      />
    </main>
  );
}
