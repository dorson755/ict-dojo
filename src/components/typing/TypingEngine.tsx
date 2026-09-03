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
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // --------------------------------------------------------
  // Derived Metrics (Live)
  // --------------------------------------------------------
  const currentIndex = typedChars.length;
  
  // Calculate live WPM
  const [liveWpm, setLiveWpm] = useState(0);
  const [liveAccuracy, setLiveAccuracy] = useState(100);

  useEffect(() => {
    if (!startedAt || isFinished) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const durationMs = now - startedAt;
      const durationMins = durationMs / 1000 / 60;
      
      // Calculate how many were correct so far
      let correctCount = 0;
      typedChars.forEach((char, i) => {
        if (char === passage[i]) correctCount++;
      });

      const words = correctCount / 5;
      const wpm = durationMins > 0 ? Math.max(0, Math.round(words / durationMins)) : 0;
      
      const accuracy = typedChars.length > 0 
        ? Math.round((correctCount / typedChars.length) * 100) 
        : 100;

      setLiveWpm(wpm);
      setLiveAccuracy(accuracy);
    }, 1000); // update every second

    return () => clearInterval(interval);
  }, [startedAt, typedChars, passage, isFinished]);

  // --------------------------------------------------------
  // Input Handling
  // --------------------------------------------------------
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isFinished) return;
    
    // Ignore meta keys, shift, caps lock, etc.
    if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta' || e.key === 'CapsLock' || e.key === 'Tab') {
      return;
    }

    const now = Date.now();

    // Start timer on first keystroke
    if (!startedAt && e.key !== 'Backspace') {
      setStartedAt(now);
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (currentIndex > 0) {
        setTypedChars(prev => prev.slice(0, -1));
        // We log backspaces in the keystroke event log too for analysis
        setKeystrokes(prev => [
          ...prev,
          {
            position: currentIndex,
            expected: 'Backspace', // special marker
            actual: 'Backspace',
            correct: false,
            timestamp_ms: now,
          }
        ]);
      }
      return;
    }

    // Stop accepting input if we've reached the end
    if (currentIndex >= passage.length) {
        return;
    }
    
    // It's a standard character
    e.preventDefault();
    const expected = passage[currentIndex];
    const actual = e.key;
    const isCorrect = expected === actual;

    setTypedChars(prev => [...prev, actual]);
    
    const newKeystrokes = [
      ...keystrokes,
      {
        position: currentIndex,
        expected,
        actual,
        correct: isCorrect,
        timestamp_ms: now,
      }
    ];
    setKeystrokes(newKeystrokes);

    // Check if finished
    if (currentIndex + 1 === passage.length) {
      setIsFinished(true);
      if (startedAt) {
          onComplete({
            studentId,
            exerciseId,
            passage,
            keystrokes: newKeystrokes,
            startedAt,
            completedAt: now,
            skillIds,
          });
      }
    }
  }, [currentIndex, isFinished, passage, keystrokes, startedAt, studentId, exerciseId, skillIds, onComplete]);

  // --------------------------------------------------------
  // Render Helpers
  // --------------------------------------------------------
  const getCharClassName = (index: number) => {
    if (index === currentIndex && isFocused) return styles.cursor;
    if (index >= typedChars.length) return styles.char;
    
    const isCorrect = typedChars[index] === passage[index];
    return isCorrect ? styles.correct : styles.incorrect;
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
            {Math.round((currentIndex / passage.length) * 100)}%
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
          // If it's a space and incorrect, we need to show something (like a red underscore)
          // otherwise an incorrect space is invisible
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
