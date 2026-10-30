'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import TypingEngine from '@/components/typing/TypingEngine';
import { TypingEvaluator } from '@/domains/typing/evaluator';
import { ghostCharsAt, raceOutcome, type RaceOutcome } from '@/domains/typing/race';
import { TypingSessionInput, TypingSessionResult } from '@/domains/typing/types';
import { submitPracticeSession } from '@/app/(main)/practice/actions';
import styles from './ghost-race.module.css';

export interface RaceExercise {
  id: string;
  title: string;
  difficulty: number;
  skillIds: string[];
  passage: string;
}

interface GamificationSummary {
  xpGained: number;
  newLevel: number;
  leveledUp: boolean;
  streak: number;
  newWpmRecord?: boolean;
  newAccuracyRecord?: boolean;
}

interface FinishedRace {
  result: TypingSessionResult;
  outcome: RaceOutcome;
  gamification?: GamificationSummary;
  nextRecReason?: string;
}

interface GhostRaceClientProps {
  studentId: string;
  exercise: RaceExercise;
  ghostWpm: number;
}

/**
 * A normal passage session run against a ghost pacing at the learner's best
 * recorded WPM. The submit path is identical to practice, so mastery for the
 * passage's skills, XP, streaks and records all count.
 */
export default function GhostRaceClient({ studentId, exercise, ghostWpm }: GhostRaceClientProps) {
  const [charsTyped, setCharsTyped] = useState(0);
  const [ghostElapsed, setGhostElapsed] = useState(0);
  const [raceStarted, setRaceStarted] = useState(false);
  const [finished, setFinished] = useState<FinishedRace | null>(null);
  const [error, setError] = useState<string | null>(null);

  const raceStartRef = useRef<number | null>(null);

  // The ghost keeps moving between keystrokes, so the strip ticks on its own.
  useEffect(() => {
    if (finished || !raceStarted || raceStartRef.current === null) return;
    const interval = setInterval(() => {
      setGhostElapsed(Date.now() - raceStartRef.current!);
    }, 100);
    return () => clearInterval(interval);
  }, [finished, raceStarted]);

  const handleProgress = (chars: number, elapsedMs: number) => {
    setCharsTyped(chars);
    if (raceStartRef.current === null) {
      raceStartRef.current = Date.now() - elapsedMs;
      setGhostElapsed(elapsedMs);
      setRaceStarted(true);
    }
  };

  const handleComplete = async (sessionData: TypingSessionInput) => {
    const evaluator = new TypingEvaluator();
    const result = evaluator.evaluate({ ...sessionData, mode: 'accuracy' });

    const last = sessionData.keystrokes[sessionData.keystrokes.length - 1];
    const youFinishMs = last
      ? last.timestamp_ms - sessionData.startedAt
      : sessionData.completedAt - sessionData.startedAt;
    const outcome = raceOutcome(sessionData.passage.length, youFinishMs, ghostWpm);
    setGhostElapsed(youFinishMs);
    setRaceStarted(false);

    if (!result.isValid) {
      setError(result.invalidReason ?? 'This race was too short to save.');
      setFinished({ result, outcome });
      return;
    }

    try {
      const response = await submitPracticeSession(
        result,
        exercise.skillIds,
        exercise.id,
        exercise.difficulty
      );
      const gamification = response.success
        ? (response.gamification as GamificationSummary | undefined)
        : undefined;
      const nextRec = response.nextRecommendation as { reason?: string } | null | undefined;
      setFinished({ result, outcome, gamification, nextRecReason: nextRec?.reason });
    } catch {
      setError('The race did not save. Check your connection and try again.');
      setFinished({ result, outcome });
    }
  };

  const passageLength = exercise.passage.length;
  const youPct = Math.min(100, (charsTyped / passageLength) * 100);
  const ghostPct = Math.min(100, (ghostCharsAt(ghostWpm, ghostElapsed) / passageLength) * 100);

  if (error && !finished) {
    return (
      <section className={styles.summary}>
        <h2 className={styles.summaryTitle}>Race failed</h2>
        <p className={styles.note}>{error}</p>
        <div className={styles.actions}>
          <Link className="btn btn-secondary" href="/games">Back to games</Link>
        </div>
      </section>
    );
  }

  if (finished) {
    const marginSeconds = Math.abs(finished.outcome.marginMs) / 1000;
    return (
      <section className={styles.summary} aria-live="polite">
        <h2 className={styles.summaryTitle}>
          {finished.outcome.won ? 'You beat the ghost.' : 'The ghost won this one.'}
        </h2>
        <p className={styles.note}>
          {finished.outcome.won
            ? `You finished ${marginSeconds.toFixed(1)}s ahead of the ${ghostWpm} WPM pace.`
            : `The ${ghostWpm} WPM pace finished ${marginSeconds.toFixed(1)}s ahead. Beat your record to win.`}
        </p>

        <div className={styles.grid}>
          <div className={styles.cell}>
            <span>Your time</span>
            <strong>{(finished.outcome.youFinishMs / 1000).toFixed(1)}s</strong>
          </div>
          <div className={styles.cell}>
            <span>Ghost time</span>
            <strong>{(finished.outcome.ghostFinishMs / 1000).toFixed(1)}s</strong>
          </div>
          <div className={styles.cell}>
            <span>WPM</span>
            <strong>{Math.round(finished.result.wpm)}</strong>
          </div>
          <div className={styles.cell}>
            <span>Accuracy</span>
            <strong>{Math.round(finished.result.accuracy)}%</strong>
          </div>
        </div>

        {finished.gamification && (
          <div className={styles.xpLine}>
            +{finished.gamification.xpGained} XP
            {finished.gamification.leveledUp ? ` · Level ${finished.gamification.newLevel} reached` : ''}
            {finished.gamification.streak > 1 ? ` · ${finished.gamification.streak} day streak` : ''}
            {finished.gamification.newWpmRecord ? ' · New best WPM' : ''}
            {finished.gamification.newAccuracyRecord ? ' · New best accuracy' : ''}
          </div>
        )}

        {finished.nextRecReason && <p className={styles.note}>Next: {finished.nextRecReason}</p>}
        {error && <p className={styles.note}>{error}</p>}

        <div className={styles.actions}>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            Race again
          </button>
          <Link className="btn btn-secondary" href="/games">Back to games</Link>
        </div>
      </section>
    );
  }

  return (
    <div>
      <div className={styles.track} role="group" aria-label="Race track: you against the ghost. The engine stats announce your live speed and accuracy.">
        <div className={styles.lane}>
          <span className={styles.laneLabel}>You</span>
          <div className={styles.bar} aria-hidden="true">
            <span className={styles.marker} style={{ left: `${youPct}%` }} />
          </div>
        </div>
        <div className={styles.lane}>
          <span className={styles.laneLabel}>Ghost {ghostWpm} WPM</span>
          <div className={styles.bar} aria-hidden="true">
            <span className={`${styles.marker} ${styles.markerGhost}`} style={{ left: `${ghostPct}%` }} />
          </div>
        </div>
      </div>
      <p className={styles.paceNote}>Finish the passage before the ghost does. Only correct keys move you forward.</p>

      <TypingEngine
        passage={exercise.passage}
        studentId={studentId}
        exerciseId={exercise.id}
        skillIds={exercise.skillIds}
        mode="accuracy"
        onComplete={handleComplete}
        onProgress={handleProgress}
        requireCorrect
      />
    </div>
  );
}
