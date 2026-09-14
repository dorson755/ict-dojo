'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { getRandomPassage, type SurvivalPassage } from '@/domains/typing/survival-passages';
import { saveSurvivalScore, getSurvivalLeaderboard } from './actions';
import type { SurvivalMode } from '@/lib/aws/repositories/survival.repository';
import styles from './survival.module.css';

const THRESHOLD_OPTIONS = [15, 20, 25, 30, 35, 40];
const THRESHOLD_INCREMENT_INTERVAL_MS = 30_000;
const THRESHOLD_INCREMENT_WPM = 5;
const THRESHOLD_CAP_WPM = 100;
const BELOW_THRESHOLD_TOLERANCE_MS = 3_000;

interface LeaderboardEntry {
  user_name: string;
  seconds_survived: number;
  words_typed: number;
  final_wpm: number;
}

interface SurvivalClientProps {
  initialLeaderboard?: LeaderboardEntry[];
  initialExtremeLeaderboard?: LeaderboardEntry[];
}

export default function SurvivalClient({
  initialLeaderboard = [],
  initialExtremeLeaderboard = [],
}: SurvivalClientProps) {
  const [status, setStatus] = useState<'idle' | 'running' | 'ended'>('idle');
  const [mode, setMode] = useState<SurvivalMode>('normal');
  const [startingWpm, setStartingWpm] = useState(15);
  const [currentThreshold, setCurrentThreshold] = useState(15);
  const [passage, setPassage] = useState<SurvivalPassage>(getRandomPassage());
  const [typed, setTyped] = useState('');
  const [currentWpm, setCurrentWpm] = useState(0);
  const [secondsSurvived, setSecondsSurvived] = useState(0);
  const [wordsTyped, setWordsTyped] = useState(0);
  const [belowSince, setBelowSince] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(initialLeaderboard);
  const [extremeLeaderboard, setExtremeLeaderboard] = useState<LeaderboardEntry[]>(initialExtremeLeaderboard);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const startTimeRef = useRef<number>(0);
  const lastIncrementRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const totalAttemptedRef = useRef(0);
  const totalCorrectRef = useRef(0);

  async function loadLeaderboard(selectedMode: SurvivalMode, wpm: number) {
    const result = await getSurvivalLeaderboard(selectedMode, wpm);
    if ('scores' in result && result.scores) {
      if (selectedMode === 'extreme') setExtremeLeaderboard(result.scores);
      else setLeaderboard(result.scores);
    }
  }

  function selectThreshold(wpm: number) {
    setStartingWpm(wpm);
    void loadLeaderboard(mode, wpm);
  }

  function selectMode(selectedMode: SurvivalMode) {
    setMode(selectedMode);
    void loadLeaderboard(selectedMode, startingWpm);
  }

  const endGame = useCallback(() => {
    setStatus((current) => {
      if (current !== 'running') return current;
      return 'ended';
    });
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  function startGame() {
    setStatus('running');
    setCurrentThreshold(startingWpm);
    setPassage(getRandomPassage());
    setTyped('');
    setCurrentWpm(0);
    setSecondsSurvived(0);
    setWordsTyped(0);
    setBelowSince(null);
    setSaved(false);
    totalAttemptedRef.current = 0;
    totalCorrectRef.current = 0;
    startTimeRef.current = Date.now();
    lastIncrementRef.current = Date.now();
    inputRef.current?.focus();
  }

  async function persistScore() {
    if (saved) return;
    const elapsedMinutes = secondsSurvived / 60;
    const finalWpm = elapsedMinutes > 0 ? Math.round(wordsTyped / elapsedMinutes) : 0;
    const accuracy = totalAttemptedRef.current > 0
      ? Math.round((totalCorrectRef.current / totalAttemptedRef.current) * 100)
      : 100;
    await saveSurvivalScore({
      mode,
      starting_wpm: startingWpm,
      final_wpm: finalWpm,
      words_typed: wordsTyped,
      seconds_survived: secondsSurvived,
      accuracy,
    });
    setSaved(true);
    void loadLeaderboard(mode, startingWpm);
  }

  useEffect(() => {
    if (status !== 'running') return;

    timerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - startTimeRef.current;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      setSecondsSurvived(elapsedSeconds);

      // Extreme mode: increment threshold every 30 seconds, capped at 100 WPM
      if (
        mode === 'extreme' &&
        now - lastIncrementRef.current >= THRESHOLD_INCREMENT_INTERVAL_MS &&
        currentThreshold < THRESHOLD_CAP_WPM
      ) {
        setCurrentThreshold((prev) => Math.min(THRESHOLD_CAP_WPM, prev + THRESHOLD_INCREMENT_WPM));
        lastIncrementRef.current = now;
      }

      // Check failure condition
      if (currentWpm < currentThreshold) {
        setBelowSince((prev) => prev ?? now);
        if (now - (belowSince ?? now) >= BELOW_THRESHOLD_TOLERANCE_MS) {
          endGame();
        }
      } else {
        setBelowSince(null);
      }
    }, 250);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status, mode, currentWpm, currentThreshold, belowSince, endGame]);

  function handleInput(event: React.ChangeEvent<HTMLTextAreaElement>) {
    if (status !== 'running') return;

    const value = event.target.value;
    const fullText = passage.text;

    // Only allow progress up to the current passage length
    if (value.length > fullText.length) return;

    // Accumulate attempted and correct characters for end-of-run accuracy
    const previousLength = typed.length;
    const newLength = value.length;
    if (newLength > previousLength) {
      for (let i = previousLength; i < newLength; i++) {
        totalAttemptedRef.current += 1;
        if (value[i] === fullText[i]) totalCorrectRef.current += 1;
      }
    }

    setTyped(value);

    // Update word count when a space or the end of passage is reached correctly
    const previousWords = typed.trim().split(/\s+/).filter(Boolean).length;
    const currentWords = value.trim().split(/\s+/).filter(Boolean).length;
    if (currentWords > previousWords) {
      setWordsTyped((prev) => prev + (currentWords - previousWords));
    }

    // Calculate WPM based on correct characters in the current passage
    const correctChars = value.split('').filter((char, index) => char === fullText[index]).length;
    const elapsedMinutes = (Date.now() - startTimeRef.current) / 60_000;
    const wpm = elapsedMinutes > 0 ? Math.round((correctChars / 5) / elapsedMinutes) : 0;
    setCurrentWpm(wpm);

    // Advance to next passage when complete
    if (value.length === fullText.length) {
      const remaining = fullText.slice(typed.length).trim();
      const remainingWords = remaining ? remaining.split(/\s+/).length : 0;
      setWordsTyped((prev) => prev + remainingWords);
      setTyped('');
      setPassage(getRandomPassage());
    }
  }

  function renderPassage() {
    const chars = passage.text.split('');
    return (
      <p className={styles.passage}>
        {chars.map((char, index) => {
          let state = 'pending';
          if (index < typed.length) {
            state = typed[index] === char ? 'correct' : 'incorrect';
          }
          return (
            <span key={index} className={styles[state]}>
              {char}
            </span>
          );
        })}
      </p>
    );
  }

  const activeLeaderboard = mode === 'extreme' ? extremeLeaderboard : leaderboard;
  const rulesText =
    mode === 'extreme'
      ? `The required speed starts at your chosen WPM, increases by 5 every 30 seconds, and caps at ${THRESHOLD_CAP_WPM} WPM. Drop below the threshold for 3 seconds and the run ends.`
      : 'The required speed stays at your chosen WPM. Drop below the threshold for 3 seconds and the run ends.';

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Typing / survival</p>
          <h1 className={styles.title}>Survival mode.</h1>
          <p className={styles.subtitle}>Stay above the WPM threshold. The longer you last, the higher it climbs.</p>
        </div>
        <Link className={styles.back} href="/practice">← Back to practice</Link>
      </header>

      {status === 'idle' && (
        <section className={styles.setup}>
          <h2>Choose your mode and speed</h2>
          <div className={styles.modes}>
            <button
              className={`${styles.modeButton} ${mode === 'normal' ? styles.active : ''}`}
              onClick={() => selectMode('normal')}
            >
              Normal
            </button>
            <button
              className={`${styles.modeButton} ${mode === 'extreme' ? styles.active : ''}`}
              onClick={() => selectMode('extreme')}
            >
              Extreme
            </button>
          </div>
          <div className={styles.thresholds}>
            {THRESHOLD_OPTIONS.map((wpm) => (
              <button
                key={wpm}
                className={`${styles.thresholdButton} ${startingWpm === wpm ? styles.active : ''}`}
                onClick={() => selectThreshold(wpm)}
              >
                {wpm} WPM
              </button>
            ))}
          </div>
          <p className={styles.rules}>{rulesText}</p>
          <button className={styles.startButton} onClick={startGame}>
            Start {mode} survival
          </button>

          <div className={styles.leaderboard}>
            <h3>{mode === 'extreme' ? 'Extreme' : 'Normal'} leaderboard — {startingWpm} WPM start</h3>
            {activeLeaderboard.length ? (
              <ol>
                {activeLeaderboard.map((entry, index) => (
                  <li key={index}>
                    <span>{entry.user_name}</span>
                    <span>{entry.seconds_survived}s · {entry.words_typed} words · {entry.final_wpm} WPM</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={styles.empty}>No scores yet. Be the first.</p>
            )}
          </div>
        </section>
      )}

      {status !== 'idle' && (
        <section className={styles.game}>
          <div className={styles.hud}>
            <div>
              <span className={styles.hudLabel}>Mode</span>
              <span className={styles.hudValue}>{mode}</span>
            </div>
            <div>
              <span className={styles.hudLabel}>Current WPM</span>
              <span className={styles.hudValue}>{currentWpm}</span>
            </div>
            <div>
              <span className={styles.hudLabel}>Threshold</span>
              <span className={styles.hudValue}>{currentThreshold}</span>
            </div>
            <div>
              <span className={styles.hudLabel}>Time</span>
              <span className={styles.hudValue}>{secondsSurvived}s</span>
            </div>
          </div>

          <div className={styles.passageCard}>
            <p className={styles.passageTitle}>
              {passage.title} <span>by {passage.author}</span>
            </p>
            {renderPassage()}
          </div>

          <textarea
            ref={inputRef}
            className={styles.input}
            value={typed}
            onChange={handleInput}
            onPaste={(event) => event.preventDefault()}
            rows={3}
            placeholder="Type the passage here..."
            aria-label="Typing input"
          />
        </section>
      )}

      {status === 'ended' && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h2>Run ended</h2>
            <p>
              You survived <strong>{secondsSurvived} seconds</strong> and typed{' '}
              <strong>{wordsTyped} words</strong> in {mode} mode.
            </p>
            <button className={styles.saveButton} onClick={persistScore} disabled={saved}>
              {saved ? 'Saved' : 'Save score'}
            </button>
            <button className={styles.restartButton} onClick={startGame}>
              Try again
            </button>
            <button className={styles.menuButton} onClick={() => setStatus('idle')}>
              Change mode / threshold
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
