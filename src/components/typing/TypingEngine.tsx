'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './TypingEngine.module.css';
import { KeystrokeEvent, TypingSessionInput } from '@/domains/typing/types';

interface TypingEngineProps {
  passage: string;
  studentId: string;
  exerciseId: string;
  skillIds: string[];
  onComplete: (data: TypingSessionInput) => void;
}

export default function TypingEngine({
  passage,
  studentId,
  exerciseId,
  skillIds,
  onComplete,
}: TypingEngineProps) {
  // --------------------------------------------------------
  // State
  // --------------------------------------------------------
  const [typedChars, setTypedChars] = useState<string[]>([]);
  const [keystrokes, setKeystrokes] = useState<KeystrokeEvent[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [liveWpm, setLiveWpm] = useState(0);
  const [liveAccuracy, setLiveAccuracy] = useState(100);

  // Use refs for values needed synchronously inside handleKeyDown
  const startedAtRef = useRef<number | null>(null);
  const typedCharsRef = useRef<string[]>([]);
  const keystrokesRef = useRef<KeystrokeEvent[]>([]);
  const isFinishedRef = useRef(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Keep refs in sync with state
  useEffect(() => { typedCharsRef.current = typedChars; }, [typedChars]);
  useEffect(() => { keystrokesRef.current = keystrokes; }, [keystrokes]);

  // --------------------------------------------------------
  // Live WPM / Accuracy ticker
  // --------------------------------------------------------
  useEffect(() => {
    if (!startedAtRef.current || isFinished) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const durationMs = now - startedAtRef.current!;
      const durationMins = durationMs / 1000 / 60;
      const chars = typedCharsRef.current;

      let correctCount = 0;
      chars.forEach((char, i) => {
        if (char === passage[i]) correctCount++;
      });

      const words = correctCount / 5;
      const wpm = durationMins > 0 ? Math.max(0, Math.round(words / durationMins)) : 0;
      const accuracy = chars.length > 0
        ? Math.round((correctCount / chars.length) * 100)
        : 100;

      setLiveWpm(wpm);
      setLiveAccuracy(accuracy);
    }, 1000);

    return () => clearInterval(interval);
  }, [isFinished, passage]);

  // --------------------------------------------------------
  // Input Handling
  // --------------------------------------------------------
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isFinishedRef.current) return;

    // Ignore modifier keys
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) return;

    const now = Date.now();

    // Start timer on first non-backspace keystroke — use ref so it's immediate
    if (!startedAtRef.current && e.key !== 'Backspace') {
      startedAtRef.current = now;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      const current = typedCharsRef.current;
      if (current.length > 0) {
        const next = current.slice(0, -1);
        typedCharsRef.current = next;
        setTypedChars(next);

        const newKs: KeystrokeEvent[] = [
          ...keystrokesRef.current,
          {
            position: current.length - 1,
            expected: 'Backspace',
            actual: 'Backspace',
            correct: false,
            timestamp_ms: now,
          },
        ];
        keystrokesRef.current = newKs;
        setKeystrokes(newKs);
      }
      return;
    }

    const currentIndex = typedCharsRef.current.length;
    if (currentIndex >= passage.length) return;

    e.preventDefault();
    const expected = passage[currentIndex];
    const actual = e.key;
    const isCorrect = expected === actual;

    const nextChars = [...typedCharsRef.current, actual];
    typedCharsRef.current = nextChars;
    setTypedChars(nextChars);

    const newKs: KeystrokeEvent[] = [
      ...keystrokesRef.current,
      { position: currentIndex, expected, actual, correct: isCorrect, timestamp_ms: now },
    ];
    keystrokesRef.current = newKs;
    setKeystrokes(newKs);

    // Check completion — use ref values so everything is synchronous
    if (currentIndex + 1 === passage.length) {
      isFinishedRef.current = true;
      setIsFinished(true);

      // startedAtRef is guaranteed to be set because we set it above on first keystroke
      onComplete({
        studentId,
        exerciseId,
        passage,
        keystrokes: newKs,
        startedAt: startedAtRef.current!,
        completedAt: now,
        skillIds,
      });
    }
  }, [passage, studentId, exerciseId, skillIds, onComplete]);

  // --------------------------------------------------------
  // Render Helpers
  // --------------------------------------------------------
  const getCharClassName = (index: number) => {
    if (index === typedChars.length && isFocused) return styles.cursor;
    if (index >= typedChars.length) return styles.char;
    return typedChars[index] === passage[index] ? styles.correct : styles.incorrect;
  };

  return (
    <div className={styles.container}>
      {/* Stats Bar */}
      <div className={styles.statsBar}>
        <div className={styles.statGroup}>
          <span className={styles.statLabel}>WPM</span>
          <span className={styles.statValue}>{liveWpm}</span>
        </div>
        <div className={styles.statGroup}>
          <span className={styles.statLabel}>Accuracy</span>
          <span className={styles.statValue}>{liveAccuracy}%</span>
        </div>
        <div className={styles.statGroup}>
          <span className={styles.statLabel}>Progress</span>
          <span className={styles.statValue}>
            {Math.round((typedChars.length / passage.length) * 100)}%
          </span>
        </div>
      </div>

      {/* Interactive Typing Area */}
      <div
        ref={containerRef}
        className={styles.passageContainer}
        tabIndex={0}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
      >
        {!isFocused && !isFinished && (
          <div className={styles.blurOverlay} onClick={() => containerRef.current?.focus()}>
            <div className={styles.clickToStart}>Click to Start Typing</div>
          </div>
        )}

        {passage.split('').map((char, index) => {
          let displayChar = char;
          if (index < typedChars.length && typedChars[index] !== char && char === ' ') {
            displayChar = '_';
          }
          return (
            <span key={index} className={getCharClassName(index)}>
              {displayChar}
            </span>
          );
        })}
      </div>
    </div>
  );
}
