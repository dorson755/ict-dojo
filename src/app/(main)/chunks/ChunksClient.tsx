'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TYPING_CHUNKS, generateChunkDrill, generateMixedChunkDrill, type TypingChunk, type ChunkType } from '@/domains/typing/chunks';
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

const MASTERY_LABELS: Record<string, string> = {
  mastered: 'Mastered',
  strong: 'Strong',
  developing: 'Developing',
  weak: 'Weak',
};

export interface ChunkMasteryInfo {
  score: number;
  level: string;
  count: number;
}

interface ChunksClientProps {
  studentId: string;
  chunkMastery: Record<string, ChunkMasteryInfo>;
}

export default function ChunksClient({ studentId, chunkMastery }: ChunksClientProps) {
  const router = useRouter();
  const [activeChunk, setActiveChunk] = useState<TypingChunk | null>(null);
  const [mixedDrill, setMixedDrill] = useState<{ passage: string; chunkIds: string[] } | null>(null);
  const [filter, setFilter] = useState<ChunkType | 'all'>('all');
  const [result, setResult] = useState<{ wpm: number; accuracy: number } | null>(null);

  const filteredChunks = useMemo(() => {
    if (filter === 'all') return TYPING_CHUNKS;
    return TYPING_CHUNKS.filter((chunk) => chunk.type === filter);
  }, [filter]);

  function formatMastery(chunkId: string): string {
    const mastery = chunkMastery[chunkId];
    if (!mastery || mastery.count === 0) return 'Not attempted yet';
    return `${Math.round(mastery.score)}% · ${MASTERY_LABELS[mastery.level] ?? mastery.level}`;
  }

  async function handleComplete(sessionData: TypingSessionInput) {
    const chunkId = mixedDrill ? 'mixed' : activeChunk?.id;
    if (!chunkId) return;
    const response = await submitChunkPractice(chunkId, sessionData, mixedDrill?.chunkIds);
    if (response.success && response.result) {
      setResult({ wpm: response.result.wpm, accuracy: response.result.accuracy });
      router.refresh();
    }
  }

  function exitDrill() {
    setActiveChunk(null);
    setMixedDrill(null);
    setResult(null);
  }

  function startMixedDrill() {
    setActiveChunk(null);
    setResult(null);
    setMixedDrill(generateMixedChunkDrill());
  }

  if (mixedDrill) {
    return (
      <main className={styles.page}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>Chunk dojo / mixed</p>
            <h1 className={styles.title}>Mixed chunk drill.</h1>
            <p className={styles.subtitle}>Random chunks, switching every word. Feel each pattern as one motion.</p>
          </div>
          <button className={styles.back} onClick={exitDrill}>
            ← Pick another drill
          </button>
        </header>

        {result ? (
          <section className={styles.result}>
            <h2>Mixed drill complete</h2>
            <div className={styles.stats}>
              <div><span>WPM</span><strong>{result.wpm}</strong></div>
              <div><span>Accuracy</span><strong>{result.accuracy}%</strong></div>
            </div>
            <button className={styles.restartButton} onClick={() => { setResult(null); setMixedDrill(generateMixedChunkDrill()); }}>
              New mixed drill
            </button>
          </section>
        ) : (
          <TypingEngine
            passage={mixedDrill.passage}
            studentId={studentId}
            exerciseId="chunk-mixed"
            skillIds={[TYPING_SKILL_IDS.chunks]}
            onComplete={handleComplete}
            mode="technique"
          />
        )}
      </main>
    );
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
          <button className={styles.back} onClick={exitDrill}>
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

      <section className={styles.mixedCard}>
        <div>
          <span className={styles.type}>Random mix</span>
          <span className={styles.pattern}>Mixed chunks</span>
          <p className={styles.examples}>Five random chunks in one drill — suffixes, prefixes, and blends switching every word.</p>
        </div>
        <button className={styles.mixedButton} onClick={startMixedDrill}>
          Start mixed drill →
        </button>
      </section>

      <section className={styles.grid}>
        {filteredChunks.map((chunk) => (
          <article className={styles.card} key={chunk.id}>
            <span className={styles.type}>{TYPE_LABELS[chunk.type]}</span>
            <span className={styles.pattern}>{chunk.label}</span>
            <p className={styles.examples}>{chunk.examples.slice(0, 4).join(', ')}</p>
            <p className={styles.mastery}>{formatMastery(chunk.id)}</p>
            <button className={styles.startButton} onClick={() => setActiveChunk(chunk)}>
              Drill {chunk.label}
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}
