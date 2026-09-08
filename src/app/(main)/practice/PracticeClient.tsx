'use client';

import React, { useState } from 'react';
import TypingEngine from '@/components/typing/TypingEngine';
import { submitPracticeSession } from './actions';
import { TypingSessionInput, TypingSessionResult } from '@/domains/typing/types';
import { TypingEvaluator } from '@/domains/typing/evaluator';
import Link from 'next/link';
import styles from './practice.module.css';

export interface PracticeExercise {
  id: string;
  domain_id: string;
  skill_ids: string[];
  title: string;
  difficulty: number;
  difficulty_metadata: Record<string, unknown>;
  content: { passage: string; hint?: string };
  is_ai_generated: boolean;
  grade_level_min: number | null;
  grade_level_max: number | null;
  created_at: string;
}

interface GamificationResult {
  xpGained: number;
  newLevel: number;
  leveledUp: boolean;
  streak: number;
}

interface PracticeClientProps {
  studentId: string;
  exercise: PracticeExercise;
}

export default function PracticeClient({ studentId, exercise }: PracticeClientProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<TypingSessionResult | null>(null);
  const [nextRec, setNextRec] = useState<{ reason?: string } | null>(null);
  const [gamification, setGamification] = useState<GamificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = async (sessionData: TypingSessionInput) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const evaluator = new TypingEvaluator();
      const resultData = evaluator.evaluate(sessionData);

      const response = await submitPracticeSession(
        resultData,
        exercise.skill_ids || [],
        exercise.id,
        exercise.difficulty
      );
      if (response.success && response.result) {
        setResult(response.result as TypingSessionResult);
        setNextRec(response.nextRecommendation as { reason?: string } | null);
        if (response.gamification) {
          setGamification({
            xpGained: response.gamification.xpGained,
            newLevel: response.gamification.newLevel,
            leveledUp: response.gamification.leveledUp,
            streak: response.gamification.streak,
          });
        }
      } else {
        setError('Failed to submit session.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className={styles.error}>
        <h3 className={styles.errorTitle}>Session failed</h3>
        <p className={styles.errorMsg}>{error}</p>
        <button onClick={() => window.location.reload()} className="btn btn-secondary">
          Try again
        </button>
      </div>
    );
  }

  if (result) {
    return (
      <div className={styles.results}>
        <h2 className={styles.resultsTitle}>Session complete</h2>

        <div className={styles.resultGrid}>
          <div className={styles.resultStat}>
            <div className={styles.resultStatLabel}>WPM</div>
            <div className={`${styles.resultStatValue} ${styles.resultWpm}`}>{result.wpm}</div>
          </div>
          <div className={styles.resultStat}>
            <div className={styles.resultStatLabel}>Accuracy</div>
            <div className={`${styles.resultStatValue} ${styles.resultAcc}`}>{result.accuracy}%</div>
          </div>
          <div className={styles.resultStat}>
            <div className={styles.resultStatLabel}>Score</div>
            <div className={`${styles.resultStatValue} ${styles.resultScore}`}>{result.compositeScore}</div>
          </div>
        </div>

        {gamification && (
          <div className={styles.xpBar}>
            <div className={styles.xpGained}>
              +{gamification.xpGained} XP
            </div>
            {gamification.leveledUp && (
              <div className={styles.levelUp}>
                Level {gamification.newLevel} reached
              </div>
            )}
            {gamification.streak > 1 && (
              <div className={styles.streakInfo}>
                {gamification.streak} day streak
              </div>
            )}
          </div>
        )}

        {nextRec && (
          <div className={styles.nextRec}>
            <h4 className={styles.nextRecTitle}>Next recommendation</h4>
            <p className={styles.nextRecReason}>{nextRec.reason}</p>
          </div>
        )}

        <div className={styles.resultActions}>
          <Link href="/dashboard" className="btn btn-secondary">
            Back to dashboard
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            Practice again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {isSubmitting && (
        <div className={styles.loading}>
          <div className={styles.loadingText}>Analyzing session...</div>
        </div>
      )}

      <TypingEngine
        passage={exercise.content.passage}
        studentId={studentId}
        exerciseId={exercise.id}
        skillIds={exercise.skill_ids}
        onComplete={handleComplete}
      />

      {exercise.content.hint && (
        <div className={styles.hint}>
          {exercise.content.hint}
        </div>
      )}
    </div>
  );
}
