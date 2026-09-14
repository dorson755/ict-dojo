'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { TYPING_CHUNKS, generateChunkDrill, type TypingChunk, type ChunkType } from '@/domains/typing/chunks';
import { TYPING_SKILL_IDS } from '@/domains/typing/catalog';
import TypingEngine from '@/components/typing/TypingEngine';
import { TypingSessionInput } from '@/domains/typing/types';
import { submitChunkPractice } from './actions';
import styles from './chunks.module.css';

const TYPE_LABELS: Record<ChunkType, string> = {
  suffix: 'Suffix',
  prefix: 'Prefix',
  blend: 'Blend',
};

interface ChunksClientProps {
  studentId: string;
}

export default function ChunksClient({ studentId }: ChunksClientProps) {
  const [activeChunk, setActiveChunk] = useState<TypingChunk | null>(null);
  const [filter, setFilter] = useState<ChunkType | 'all'>('all');
  const [result, setResult] = useState<{ wpm: number; accuracy: number } | null>(null);

  const filteredChunks = useMemo(() => {
    if (filter === 'all') return TYPING_CHUNKS;
    return TYPING_CHUNKS.filter((chunk) => chunk.type === filter);
  }, [filter]);

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

      <div className={styles.filters}>
        {(['all', 'prefix', 'suffix', 'blend'] as const).map((type) => (
          <button
            key={type}
            className={`${styles.filterButton} ${filter === type ? styles.active : ''}`}
            onClick={() => setFilter(type)}
          >
            {type === 'all' ? 'All' : TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      <section className={styles.grid}>
        {filteredChunks.map((chunk) => (
          <article className={styles.card} key={chunk.id}>
            <span className={styles.type}>{TYPE_LABELS[chunk.type]}</span>
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
