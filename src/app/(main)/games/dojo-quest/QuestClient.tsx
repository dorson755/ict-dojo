'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { QuestContent, QuestStage } from '@/domains/typing/quest';
import { TypingEvaluator } from '@/domains/typing/evaluator';
import { submitPracticeSession } from '@/app/(main)/practice/actions';
import { prepareQuestStage } from './actions';
import { createQuestGame } from './quest-engine';
import type { QuestRound, QuestStatus } from './quest-engine';
import styles from './quest.module.css';

export default function QuestClient({
  stage,
  studentId,
}: {
  stage: QuestStage;
  studentId: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const game = useRef<ReturnType<typeof createQuestGame> | null>(null);
  const [content, setContent] = useState<QuestContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [sound, setSound] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<QuestStatus | null>(null);
  const [summary, setSummary] = useState<{
    won: boolean;
    words: number;
    wpm: number;
    accuracy: number;
    message: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const saveRound = useCallback(
    async (round: QuestRound) => {
      const result = new TypingEvaluator().evaluate({
        studentId,
        exerciseId: `game-dojo-quest-${stage.belt}`,
        passage: round.passage,
        keystrokes: round.keystrokes,
        startedAt: 0,
        completedAt: Math.round(round.durationMs),
        skillIds: ['typing-common-words'],
        mode: 'accuracy',
      });
      const base = {
        won: round.won,
        words: round.cleared,
        wpm: result.wpm,
        accuracy: result.accuracy,
      };
      if (!result.isValid) {
        setSummary({
          ...base,
          message: `${result.invalidReason} This round did not count toward progress.`,
        });
        return;
      }
      setSaving(true);
      try {
        // Creature words are the only skill guaranteed in every round. A loss
        // before the boss must not credit punctuation or sentence mastery.
        const response = await submitPracticeSession(
          result,
          ['typing-common-words'],
          `game-dojo-quest-${stage.belt}`,
          Math.min(5, 1 + Math.floor(stage.belt / 2)),
        );
        const xp = response.gamification?.xpGained;
        setSummary({
          ...base,
          message: response.success
            ? `Round saved.${typeof xp === 'number' ? ` +${xp} XP.` : ''}`
            : 'Your round did not save. Check your connection and try again.',
        });
      } catch {
        setSummary({
          ...base,
          message: 'Your round did not save. Check your connection and try again.',
        });
      } finally {
        setSaving(false);
      }
    },
    [studentId, stage.belt],
  );

  useEffect(() => {
    if (!content || !canvas.current) return;
    try {
      const instance = createQuestGame(
        canvas.current,
        stage,
        content,
        (round) => {
          void saveRound(round);
        },
        setStatus,
        () => setReady(true),
        () => setError('Game art could not load. Reload the page to try again.'),
      );
      game.current = instance;
      return () => {
        instance.destroy();
        game.current = null;
      };
    } catch {
      // Report asynchronously, like the image-loading callbacks.
      queueMicrotask(() => setError('This browser cannot display the game. Try another browser.'));
    }
  }, [content, stage, saveRound]);

  useEffect(() => {
    game.current?.setSound(sound);
  }, [sound, content]);

  async function start() {
    setLoading(true);
    setError('');
    setSummary(null);
    setStatus(null);
    setReady(false);
    setContent(null);
    try {
      setContent(await prepareQuestStage(stage.belt));
    } catch {
      setError('The stage could not open. Check your connection, then try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {!content && (
        <section className={styles.instructions}>
          <h2>Accuracy opens the gate.</h2>
          <p>
            Your first letter locks a creature. Finish its word before it reaches you. Three hits
            end the round.
          </p>
          <p>
            The boss scroll needs every character, including spaces, capitals, and punctuation.
            Wrong keys do not advance it.
          </p>
          <p>Click away to pause. Use a physical keyboard and a wider screen for the best view.</p>
          <button className="btn btn-primary" disabled={loading} onClick={() => void start()}>
            {loading ? 'Preparing your words…' : 'Prepare stage'}
          </button>
        </section>
      )}
      {content && (
        <>
          <div className={styles.toolbar}>
            <p>
              {content.source === 'ai'
                ? 'AI-picked words and scroll'
                : 'Local word pool and scroll (fallback)'}
              {content.focusKeys.length > 0 ? ` · Focus keys: ${content.focusKeys.join(' ')}` : ''}
            </p>
            <button
              className="btn btn-secondary"
              aria-pressed={sound}
              onClick={() => setSound(!sound)}
            >
              Sound {sound ? 'on' : 'off'}
            </button>
          </div>
          {!ready && !error && <p role="status">Loading the courtyard…</p>}
          <canvas
            ref={canvas}
            width={768}
            height={432}
            tabIndex={0}
            className={styles.canvas}
            role="img"
            aria-label="Dojo Quest keyboard game"
            aria-describedby="quest-help quest-status"
          />
          <p id="quest-help" className={styles.note}>
            Click the game, then press Enter. Type creature words exactly. Click away to pause.
          </p>
          <div id="quest-status" className={styles.status}>
            <span>
              {status
                ? `Hearts: ${status.hearts}/3. Cleared: ${status.cleared}/${stage.waveSize}.`
                : 'Ready when the art loads.'}
            </span>
            {status?.phase === 'bossIntro' && (
              <p role="status">Boss ready. Press Enter to type the scroll.</p>
            )}
            {status?.words.length ? (
              <p>
                Words: {status.words.join(', ')}
                {status.target ? ` · Keep typing: ${status.target}` : ''}
              </p>
            ) : null}
            {status?.scroll && (
              <p className={styles.scroll}>
                Scroll: <span>{status.scroll}</span>
              </p>
            )}
          </div>
        </>
      )}
      {error && (
        <p role="alert" className={styles.note}>
          {error}
        </p>
      )}
      {saving && <p role="status">Saving your round…</p>}
      {summary && (
        <section className={styles.summary} aria-live="polite">
          <h2>{summary.won ? 'Stage clear.' : 'Rest, then return.'}</h2>
          <p>
            {summary.words} words cleared · {Math.round(summary.wpm)} WPM ·{' '}
            {Math.round(summary.accuracy)}% accuracy
          </p>
          <p>{summary.message}</p>
          <div className={styles.toolbar}>
            <button className="btn btn-primary" onClick={() => void start()} disabled={loading}>
              Play again
            </button>
            <Link className="btn btn-secondary" href="/games/dojo-quest">
              All stages
            </Link>
          </div>
        </section>
      )}
      <p className={styles.credit}>
        Art and sound:{' '}
        <a
          href="https://pixel-boy.itch.io/ninja-adventure-asset-pack"
          target="_blank"
          rel="noreferrer"
        >
          Ninja Adventure
        </a>{' '}
        by Pixel-Boy and AAA (<a href="/dojo-quest/LICENSE-ninja-adventure.txt">CC0</a>).
      </p>
    </div>
  );
}
