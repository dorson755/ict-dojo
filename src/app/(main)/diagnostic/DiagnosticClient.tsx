'use client';

import React, { useState } from 'react';
import TypingEngine from '@/components/typing/TypingEngine';
import {
  DiagnosticStage,
  DiagnosticStageAttempt,
  TypingSessionInput,
} from '@/domains/typing/types';
import { TypingEvaluator } from '@/domains/typing/evaluator';
import { submitDiagnostic } from './actions';
import { useRouter } from 'next/navigation';
import styles from '../practice/practice.module.css';
import { TYPING_SKILL_IDS } from '@/domains/typing/catalog';

interface DiagnosticClientProps {
  studentId: string;
}

const STAGES = [
  {
    id: 'keyboard_familiarity' as DiagnosticStage,
    title: 'Keyboard familiarity',
    passage: 'a s d f j k l ; q w e r u i o p',
    hint: 'Find each key calmly. There is no need to rush.',
    skillIds: [TYPING_SKILL_IDS.keyboardFamiliarity],
  },
  {
    id: 'letter_combinations' as DiagnosticStage,
    title: 'Letter combinations',
    passage: 'asdf jkl; qwer uiop zxcv bnm,',
    hint: 'Reach for each row, then return to home row.',
    skillIds: [TYPING_SKILL_IDS.homeRow, TYPING_SKILL_IDS.topRow, TYPING_SKILL_IDS.bottomRow],
  },
  {
    id: 'words' as DiagnosticStage,
    title: 'Common words',
    passage: 'the quick brown fox jumps over the lazy dog',
    hint: 'Find a comfortable, steady pace.',
    skillIds: [TYPING_SKILL_IDS.commonWords],
  },
  {
    id: 'sentences' as DiagnosticStage,
    title: 'Sentences',
    passage: 'Typing is a skill that improves with patient daily practice.',
    hint: 'Stay smooth through spaces and punctuation.',
    skillIds: [TYPING_SKILL_IDS.sentenceFluency, TYPING_SKILL_IDS.capitalization, TYPING_SKILL_IDS.punctuation],
  },
  {
    id: 'passage' as DiagnosticStage,
    title: 'Short passage',
    passage: 'On Friday, Maya finished 3 tasks: type notes, check data, and share her work.',
    hint: 'Use the same calm rhythm from the earlier stages.',
    skillIds: [TYPING_SKILL_IDS.sentenceFluency, TYPING_SKILL_IDS.numbers],
  },
];

export default function DiagnosticClient({ studentId }: DiagnosticClientProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [results, setResults] = useState<DiagnosticStageAttempt[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleComplete = async (sessionData: TypingSessionInput) => {
    const evaluator = new TypingEvaluator();
    const result = evaluator.evaluate(sessionData);

    const newResults = [...results, {
      stage: STAGES[currentStage].id,
      sessionResult: result,
      skillIds: STAGES[currentStage].skillIds,
    }];
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
        skillIds={stage.skillIds}
        onComplete={handleComplete}
      />

      <div className={styles.hint}>{stage.hint}</div>
    </div>
  );
}
