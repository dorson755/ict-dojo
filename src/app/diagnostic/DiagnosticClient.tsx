'use client';

import React, { useState } from 'react';
import TypingEngine from '@/components/typing/TypingEngine';
import { TypingSessionInput, TypingSessionResult } from '@/domains/typing/types';
import { TypingEvaluator } from '@/domains/typing/evaluator';
import { submitDiagnostic } from './actions';
import { useRouter } from 'next/navigation';

interface DiagnosticClientProps {
  studentId: string;
}

const STAGES = [
  {
    title: 'Stage 1: Home Row',
    passage: 'asdf jkl; asdf jkl; asdf jkl; asdf jkl; asdf jkl;',
    hint: 'Keep your fingers on the home row.',
  },
  {
    title: 'Stage 2: Common Words',
    passage: 'the quick brown fox jumps over the lazy dog.',
    hint: 'Type at a comfortable, steady pace.',
  },
  {
    title: 'Stage 3: Full Sentence',
    passage: 'Typing is a skill that requires practice and patience to master.',
    hint: 'Don\'t worry too much about mistakes, just keep going.',
  }
];

export default function DiagnosticClient({ studentId }: DiagnosticClientProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [results, setResults] = useState<TypingSessionResult[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleComplete = async (sessionData: TypingSessionInput) => {
    // We evaluate locally for the diagnostic to save time/server roundtrips,
    // then submit the batch at the end.
    const evaluator = new TypingEvaluator();
    const result = evaluator.evaluate(sessionData);
    
    const newResults = [...results, result];
    setResults(newResults);

    if (currentStage < STAGES.length - 1) {
      setCurrentStage(prev => prev + 1);
    } else {
      // Finished all stages
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
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <h2>Analyzing your skills...</h2>
        <p>Setting up your Dojo profile.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stage.title}</h2>
        <p style={{ color: '#64748b' }}>Stage {currentStage + 1} of {STAGES.length}</p>
      </div>

      {/* Force a remount of TypingEngine on stage change using key */}
      <TypingEngine
        key={currentStage}
        passage={stage.passage}
        studentId={studentId}
        exerciseId={`diag-stage-${currentStage}`}
        skillIds={[]} // Not tied to specific skills yet
        onComplete={handleComplete}
      />

      <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#fef3c7', color: '#b45309', borderRadius: '8px', textAlign: 'center' }}>
        <strong>Hint:</strong> {stage.hint}
      </div>
    </div>
  );
}
