'use client';

import React, { useState } from 'react';
import TypingEngine from '@/components/typing/TypingEngine';
import { TypingSessionInput, TypingSessionResult } from '@/domains/typing/types';
import { TypingEvaluator } from '@/domains/typing/evaluator';
import { submitDiagnostic } from './actions';
import { useRouter } from 'next/navigation';
import styles from '../practice/practice.module.css';

interface DiagnosticClientProps {
  studentId: string;
}

const STAGES = [
  {
    title: 'Home Row',
    passage: 'asdf jkl; asdf jkl; asdf jkl; asdf jkl; asdf jkl;',
    hint: 'Keep your fingers on the home row.',
  },
  {
    title: 'Common Words',
    passage: 'the quick brown fox jumps over the lazy dog.',
    hint: 'Type at a comfortable, steady pace.',
  },
  {
    title: 'Full Sentence',
    passage: 'Typing is a skill that requires practice and patience to master.',
    hint: "Don't worry about mistakes, just keep going.",
  },
];

export default function DiagnosticClient({ studentId }: DiagnosticClientProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [results, setResults] = useState<TypingSessionResult[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleComplete = async (sessionData: TypingSessionInput) => {
    const evaluator = new TypingEvaluator();
    const result = evaluator.evaluate(sessionData);

    const newResults = [...results, result];
    setResults(newResults);

    if (currentStage < STAGES.length - 1) {
      setCurrentStage((prev) => prev + 1);
    } else {
      setIsSubmitting(true);
      try {
        await submitDiagnostic(newResults);
        router.push('/dashboard');
      } catch (err) {
        console.error(err);
        alert('Failed to save diagnostic results.');
        setIsSubmitting(false);
      }
    }
  };

  const stage = STAGES[currentStage];

  if (isSubmitting) {
    return (
      <div className={styles.analyzing}>
        <h2>Analyzing your skills</h2>
        <p>Setting up your dojo profile.</p>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.diagStage}>
        <h2 className={styles.diagStageTitle}>{stage.title}</h2>
        <p className={styles.diagStageNum}>
          Stage {currentStage + 1} of {STAGES.length}
        </p>
      </div>

      <TypingEngine
        key={currentStage}
        passage={stage.passage}
        studentId={studentId}
        exerciseId={`diag-stage-${currentStage}`}
        skillIds={[]}
        onComplete={handleComplete}
      />

      <div className={styles.hint}>{stage.hint}</div>
    </div>
  );
}
