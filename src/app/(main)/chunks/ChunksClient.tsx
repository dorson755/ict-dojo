'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TYPING_CHUNKS, generateChunkDrill, type TypingChunk } from '@/domains/typing/chunks';
import { TYPING_SKILL_IDS } from '@/domains/typing/catalog';
import TypingEngine from '@/components/typing/TypingEngine';
import { TypingSessionInput } from '@/domains/typing/types';
import { submitChunkPractice } from './actions';
import styles from './chunks.module.css';

interface ChunksClientProps {
  studentId: string;
}

export default function ChunksClient({ studentId }: ChunksClientProps) {
  const [activeChunk, setActiveChunk] = useState<TypingChunk | null>(null);
  const [result, setResult] = useState<{ wpm: number; accuracy: number } | null>(null);

  async function handleComplete(sessionData: TypingSessionInput) {
    if (!activeChunk) return;
    const response = await submitChunkPractice(activeChunk.id, sessionData);
    if (response.success && response.result) {
      setResult({ wpm: response.result.wpm, accuracy: response.result.accuracy });
    }
  }

  if (activeChunk) {
    return (
      <main className={styles.page}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>Chunk dojo / {activeChunk.label}</p>
            <h1 className={styles.title}>Drill the {activeChunk.label} chunk.</h1>
            <p className={styles.subtitle}>Type the words. Focus on the chunk feeling like one motion.</p>
          </div>
          <button className={styles.back} onClick={() => { setActiveChunk(null); setResult(null); }}>
            ← Pick another chunk
          </button>
        </header>

        {result ? (
          <section className={styles.result}>
            <h2>Chunk complete</h2>
            <div className={styles.stats}>
              <div><span>WPM</span><strong>{result.wpm}</strong></div>
              <div><span>Accuracy</span><strong>{result.accuracy}%</strong></div>
            </div>
            <button className={styles.restartButton} onClick={() => setResult(null)}>
              Drill {activeChunk.label} again
            </button>
          </section>
        ) : (
          <TypingEngine
            passage={generateChunkDrill(activeChunk)}
            studentId={studentId}
            exerciseId={`chunk-${activeChunk.id}`}
            skillIds={[TYPING_SKILL_IDS.chunks]}
            onComplete={handleComplete}
            mode="technique"
          />
        )}
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Typing / chunks</p>
          <h1 className={styles.title}>Chunk dojo.</h1>
          <p className={styles.subtitle}>Train muscle memory for common letter groups.</p>
        </div>
        <Link className={styles.back} href="/practice">← Back to practice</Link>
      </header>

      <section className={styles.grid}>
        {TYPING_CHUNKS.map((chunk) => (
          <article className={styles.card} key={chunk.id}>
            <span className={styles.pattern}>{chunk.label}</span>
            <p className={styles.examples}>{chunk.examples.slice(0, 4).join(', ')}</p>
            <button className={styles.startButton} onClick={() => setActiveChunk(chunk)}>
              Drill {chunk.label}
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}
