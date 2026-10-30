'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { KeystrokeEvent, TypingSessionResult } from '@/domains/typing/types';
import { TypingEvaluator } from '@/domains/typing/evaluator';
import { pickGameWords } from '@/domains/typing/word-bank';
import { submitPracticeSession } from '@/app/(main)/practice/actions';
import styles from './falling-words.module.css';

const GAME_ID = 'game-falling-words';
const SKILL_ID = 'typing-common-words';
const GAME_DIFFICULTY = 2;

const PLAY_HEIGHT = 340;
const LIVES = 3;
const MAX_WORDS_ON_SCREEN = 6;
const BATCH = 24;

const START_FALL_PX_PER_MS = 0.045; // ~7.5s to cross at the start
const MAX_FALL_PX_PER_MS = 0.18;
const FALL_RAMP_PER_SECOND = 0.0015;
const START_SPAWN_MS = 2600;
const MIN_SPAWN_MS = 1200;
const SPAWN_SPEEDUP_PER_MS = 30 / 1000;

interface FallingWord {
  id: number;
  text: string;
  x: number; // px from the left
  y: number; // px from the top
  base: number; // position of its first char in the virtual passage
}

interface Frame {
  words: Array<{ id: number; text: string; x: number; y: number }>;
  lockedWordId: number | null;
  lockedTyped: number;
  lives: number;
  destroyed: number;
  attempts: number;
  correct: number;
  minutes: number;
}

interface GamificationSummary {
  xpGained: number;
  newLevel: number;
  leveledUp: boolean;
  streak: number;
  newWpmRecord?: boolean;
  newAccuracyRecord?: boolean;
}

interface RoundSummary {
  result: TypingSessionResult;
  tooShort: boolean;
  destroyed: number;
  gamification?: GamificationSummary;
  nextRecReason?: string;
}

interface FallingWordsClientProps {
  studentId: string;
  weakKeys: Record<string, number>;
}

/**
 * ZType-style arcade drill. Every keystroke is logged against a virtual passage
 * built from the spawned words, then scored by the same evaluator and submitted
 * through the same session pipeline as practice — so XP, streaks, records,
 * weak keys and skill mastery all update.
 *
 * The game loop mutates refs (60fps without state churn) and mirrors one
 * snapshot per frame into `frame`, which is the only thing render reads.
 */
export default function FallingWordsClient({ studentId, weakKeys }: FallingWordsClientProps) {
  const [phase, setPhase] = useState<'idle' | 'running' | 'ended'>('idle');
  const [frame, setFrame] = useState<Frame>({
    words: [],
    lockedWordId: null,
    lockedTyped: 0,
    lives: LIVES,
    destroyed: 0,
    attempts: 0,
    correct: 0,
    minutes: 0,
  });
  const [isFocused, setIsFocused] = useState(false);
  const [summary, setSummary] = useState<RoundSummary | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<FallingWord[]>([]);
  const lockedRef = useRef<{ word: FallingWord; typed: number } | null>(null);
  const livesRef = useRef(LIVES);
  const destroyedRef = useRef(0);
  const keystrokesRef = useRef<KeystrokeEvent[]>([]);
  const virtualRef = useRef('');
  const startedAtRef = useRef<number | null>(null);
  const nextIdRef = useRef(1);
  const queueRef = useRef<string[]>([]);
  const lastSpawnRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef<'idle' | 'running' | 'ended'>('idle');
  const focusedRef = useRef(false);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const syncFrame = useCallback(() => {
    const keystrokes = keystrokesRef.current;
    setFrame({
      words: wordsRef.current.map((word) => ({ ...word })),
      lockedWordId: lockedRef.current?.word.id ?? null,
      lockedTyped: lockedRef.current?.typed ?? 0,
      lives: livesRef.current,
      destroyed: destroyedRef.current,
      attempts: keystrokes.length,
      correct: keystrokes.filter((stroke) => stroke.correct).length,
      minutes: startedAtRef.current ? (Date.now() - startedAtRef.current) / 60_000 : 0,
    });
  }, []);

  const elapsedMs = useCallback(
    () => (startedAtRef.current ? Date.now() - startedAtRef.current : 0),
    []
  );

  const fallSpeed = useCallback(() => {
    const ramp = Math.min(
      MAX_FALL_PX_PER_MS - START_FALL_PX_PER_MS,
      (elapsedMs() / 1000) * FALL_RAMP_PER_SECOND
    );
    const speed = START_FALL_PX_PER_MS + ramp;
    return reducedMotionRef.current ? speed * 0.6 : speed;
  }, [elapsedMs]);

  const spawnInterval = useCallback(
    () => Math.max(MIN_SPAWN_MS, START_SPAWN_MS - elapsedMs() * SPAWN_SPEEDUP_PER_MS),
    [elapsedMs]
  );

  const nextWord = useCallback(() => {
    if (queueRef.current.length === 0) {
      queueRef.current = pickGameWords(weakKeys, BATCH);
    }
    return queueRef.current.shift() ?? 'the';
  }, [weakKeys]);

  const spawn = useCallback(
    (now: number) => {
      if (wordsRef.current.length >= MAX_WORDS_ON_SCREEN) return;
      const text = nextWord();
      const base = virtualRef.current.length;
      virtualRef.current += text;
      // Keep the whole word inside the play area, whatever the screen width.
      const width = containerRef.current?.clientWidth ?? 640;
      const estimate = text.length * 12 + 28;
      const x = 8 + Math.random() * Math.max(40, width - estimate - 16);
      wordsRef.current.push({ id: nextIdRef.current++, text, x, y: -26, base });
      lastSpawnRef.current = now;
    },
    [nextWord]
  );

  const submit = useCallback(async () => {
    const destroyed = destroyedRef.current;
    const completedAt = Date.now();
    const evaluator = new TypingEvaluator();
    const result = evaluator.evaluate({
      studentId,
      exerciseId: GAME_ID,
      passage: virtualRef.current,
      keystrokes: keystrokesRef.current,
      startedAt: startedAtRef.current ?? completedAt,
      completedAt,
      skillIds: [SKILL_ID],
      mode: 'accuracy',
    });

    if (!result.isValid) {
      setSummary({ result, tooShort: true, destroyed });
      return;
    }

    try {
      const response = await submitPracticeSession(result, [SKILL_ID], GAME_ID, GAME_DIFFICULTY);
      if (response.success) {
        const gamification = response.gamification as GamificationSummary | undefined;
        const nextRec = response.nextRecommendation as { reason?: string } | null | undefined;
        setSummary({ result, tooShort: false, destroyed, gamification, nextRecReason: nextRec?.reason });
      } else {
        setSummary({ result, tooShort: false, destroyed });
      }
    } catch {
      setSubmitError('Your score did not save. Check your connection and play again.');
      setSummary({ result, tooShort: false, destroyed });
    }
  }, [studentId]);

  const endGame = useCallback(() => {
    if (phaseRef.current !== 'running') return;
    phaseRef.current = 'ended';
    setPhase('ended');
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    void submit();
  }, [submit]);

  // The game loop moves words and spawns new ones. Falls while the play area is
  // not focused are paused so a lost click never costs a life.
  useEffect(() => {
    if (phase !== 'running') return;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;

      if (focusedRef.current) {
        const speed = fallSpeed();
        for (const word of wordsRef.current) word.y += speed * dt;

        const landed = wordsRef.current.filter((word) => word.y >= PLAY_HEIGHT - 22);
        if (landed.length > 0) {
          const landedIds = new Set(landed.map((word) => word.id));
          wordsRef.current = wordsRef.current.filter((word) => !landedIds.has(word.id));
          if (lockedRef.current && landedIds.has(lockedRef.current.word.id)) lockedRef.current = null;
          livesRef.current -= landed.length;
          if (livesRef.current <= 0) {
            syncFrame();
            endGame();
            return;
          }
        }

        if (now - lastSpawnRef.current >= spawnInterval()) spawn(now);
      }

      syncFrame();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, endGame, fallSpeed, spawnInterval, spawn, syncFrame]);

  const startRound = useCallback(() => {
    wordsRef.current = [];
    lockedRef.current = null;
    livesRef.current = LIVES;
    destroyedRef.current = 0;
    keystrokesRef.current = [];
    virtualRef.current = '';
    startedAtRef.current = null;
    queueRef.current = pickGameWords(weakKeys, BATCH);
    lastSpawnRef.current = performance.now();
    setSummary(null);
    setSubmitError(null);
    phaseRef.current = 'running';
    setPhase('running');
    syncFrame();
    containerRef.current?.focus();
  }, [weakKeys, syncFrame]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (phaseRef.current !== 'running') return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const key = event.key;
      if (key.length !== 1) return; // only printable characters
      event.preventDefault();
      if (key === ' ') return; // words hold no spaces; the spacebar habit is not punished here
      if (wordsRef.current.length === 0) return;

      const now = Date.now();
      if (!startedAtRef.current) startedAtRef.current = now;

      const locked = lockedRef.current;
      if (locked) {
        const expected = locked.word.text[locked.typed];
        const correct = key === expected;
        keystrokesRef.current.push({
          position: locked.word.base + locked.typed,
          expected,
          actual: key,
          correct,
          timestamp_ms: now,
        });
        if (correct) {
          locked.typed += 1;
          if (locked.typed >= locked.word.text.length) {
            const id = locked.word.id;
            wordsRef.current = wordsRef.current.filter((word) => word.id !== id);
            lockedRef.current = null;
            destroyedRef.current += 1;
          }
        }
        syncFrame();
        return;
      }

      // No lock yet: the first matching letter locks the most urgent word.
      const candidates = wordsRef.current.filter((word) => word.text[0] === key);
      if (candidates.length > 0) {
        const target = candidates.reduce((worst, word) => (word.y > worst.y ? word : worst));
        keystrokesRef.current.push({
          position: target.base,
          expected: key,
          actual: key,
          correct: true,
          timestamp_ms: now,
        });
        lockedRef.current = { word: target, typed: 1 };
        syncFrame();
        return;
      }

      // Nothing matched: an error against the most urgent word on screen.
      const urgent = wordsRef.current.reduce<FallingWord | null>(
        (worst, word) => (worst === null || word.y > worst.y ? word : worst),
        null
      );
      if (urgent) {
        keystrokesRef.current.push({
          position: urgent.base,
          expected: urgent.text[0],
          actual: key,
          correct: false,
          timestamp_ms: now,
        });
      }
      syncFrame();
    },
    [syncFrame]
  );

  const liveWpm = frame.minutes > 0 ? Math.round(frame.correct / 5 / frame.minutes) : 0;
  const liveAccuracy = frame.attempts > 0 ? Math.round((frame.correct / frame.attempts) * 100) : 100;

  if (phase === 'ended' && summary) {
    return (
      <section className={styles.summary} aria-live="polite">
        <h2 className={styles.summaryTitle}>
          {summary.tooShort ? 'Round over — too short to count.' : 'Round complete.'}
        </h2>

        {summary.tooShort ? (
          <p className={styles.note}>
            {summary.result.invalidReason} Try another round.
          </p>
        ) : (
          <>
            <div className={styles.grid}>
              <div className={styles.cell}>
                <span>Words cleared</span>
                <strong>{summary.destroyed}</strong>
              </div>
              <div className={styles.cell}>
                <span>WPM</span>
                <strong>{Math.round(summary.result.wpm)}</strong>
              </div>
              <div className={styles.cell}>
                <span>Accuracy</span>
                <strong>{Math.round(summary.result.accuracy)}%</strong>
              </div>
            </div>

            {summary.gamification && (
              <div className={styles.xpLine}>
                +{summary.gamification.xpGained} XP
                {summary.gamification.leveledUp ? ` · Level ${summary.gamification.newLevel} reached` : ''}
                {summary.gamification.streak > 1 ? ` · ${summary.gamification.streak} day streak` : ''}
                {summary.gamification.newWpmRecord ? ' · New best WPM' : ''}
                {summary.gamification.newAccuracyRecord ? ' · New best accuracy' : ''}
              </div>
            )}

            {summary.nextRecReason && (
              <p className={styles.note}>Next: {summary.nextRecReason}</p>
            )}
          </>
        )}

        {submitError && <p className={styles.note}>{submitError}</p>}

        <div className={styles.actions}>
          <button type="button" className="btn btn-primary" onClick={startRound}>
            Play again
          </button>
          <Link className="btn btn-secondary" href="/games">
            Back to games
          </Link>
        </div>
      </section>
    );
  }

  if (phase === 'ended') {
    return <p role="status" className={styles.note}>Saving your round…</p>;
  }

  return (
    <div>
      <div className={styles.statsBar} aria-live="polite">
        <span className={styles.stat}>Words<b>{frame.destroyed}</b></span>
        <span className={styles.stat}>
          Lives
          <span className={styles.lives} role="img" aria-label={`${Math.max(0, frame.lives)} lives remaining`}>
            {Array.from({ length: LIVES }, (_, index) => (
              <span
                key={index}
                className={`${styles.life} ${index >= frame.lives ? styles.spent : ''}`}
              />
            ))}
          </span>
        </span>
        <span className={styles.stat}>WPM<b>{liveWpm}</b></span>
        <span className={styles.stat}>Accuracy<b>{liveAccuracy}%</b></span>
      </div>

      <div
        ref={containerRef}
        className={styles.playArea}
        tabIndex={0}
        role="textbox"
        aria-label="Falling words game. Type each falling word before it reaches the bottom."
        onKeyDown={handleKeyDown}
        onFocus={() => {
          setIsFocused(true);
          focusedRef.current = true;
        }}
        onBlur={() => {
          setIsFocused(false);
          focusedRef.current = false;
        }}
      >
        {frame.words.map((word) => {
          const locked = frame.lockedWordId === word.id;
          return (
            <span
              key={word.id}
              className={`${styles.word} ${locked ? styles.locked : ''}`}
              style={{ left: word.x, top: word.y }}
            >
              {locked ? (
                <>
                  <span className={styles.typed}>{word.text.slice(0, frame.lockedTyped)}</span>
                  {word.text.slice(frame.lockedTyped)}
                </>
              ) : (
                word.text
              )}
            </span>
          );
        })}

        {phase === 'idle' && (
          <div className={styles.overlay}>
            <div className={styles.overlayCard}>
              <h2 className={styles.summaryTitle}>Falling Words</h2>
              <ul className={styles.rules}>
                <li>Words fall from the top and speed up over time.</li>
                <li>Your first keystroke locks the word it matches.</li>
                <li>Type the whole word to clear it; three words land and the round ends.</li>
                <li>Every round is a real session: XP, streak and records count.</li>
              </ul>
              <button type="button" className="btn btn-primary" onClick={startRound}>
                Start round
              </button>
            </div>
          </div>
        )}

        {phase === 'running' && !isFocused && (
          <div className={styles.overlay}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => containerRef.current?.focus()}
            >
              Click to keep playing
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
