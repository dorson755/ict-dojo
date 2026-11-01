'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { TypingEvaluator } from '@/domains/typing/evaluator';
import type { QuestContent, QuestStage } from '@/domains/typing/quest';
import { submitPracticeSession } from '@/app/(main)/practice/actions';
import { prepareQuestStage } from '../dojo-quest/actions';
import { createStageMusic } from '../dojo-quest/stage-music';
import type { QuestRound } from '../dojo-quest/quest-engine';
import { createDefenseGame } from './defense-engine';
import type { DefenseStatus } from './defense-engine';
import styles from './defense.module.css';

export default function DefenseClient({
  stage,
  studentId,
}: {
  stage: QuestStage;
  studentId: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const game = useRef<ReturnType<typeof createDefenseGame> | null>(null);
  const music = useRef<ReturnType<typeof createStageMusic> | null>(null);
  const [content, setContent] = useState<QuestContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [sound, setSound] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [volume, setVolume] = useState(25);
  const [musicError, setMusicError] = useState(false);
  const [status, setStatus] = useState<DefenseStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<{
    won: boolean;
    words: number;
    wpm: number;
    accuracy: number;
    message: string;
  } | null>(null);

  useEffect(() => {
    const instance = createStageMusic('courtyard', () => {
      setMusicEnabled(false);
      setMusicError(true);
    });
    music.current = instance;
    return () => {
      instance.destroy();
      music.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = music.current;
    instance?.setScene(status && status.wave > 5 ? 'boss' : 'stage');
    instance?.setActive(
      !!content &&
        ready &&
        status?.phase === 'playing' &&
        !status.paused &&
        !document.hidden &&
        document.activeElement === canvas.current &&
        !saving &&
        !summary &&
        !error,
    );
  }, [content, ready, status, saving, summary, error]);

  // Stop immediately on blur/hidden, rather than waiting for a canvas status tick.
  useEffect(() => {
    const visibility = () => {
      if (document.hidden) music.current?.setActive(false);
    };
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, []);

  const saveRound = useCallback(
    async (round: QuestRound) => {
      const result = new TypingEvaluator().evaluate({
        studentId,
        exerciseId: 'game-dojo-defense',
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
        const response = await submitPracticeSession(
          result,
          ['typing-common-words'],
          'game-dojo-defense',
          Math.min(5, 1 + Math.floor(stage.belt / 2)),
        );
        const xp = response.gamification?.xpGained;
        setSummary({
          ...base,
          message: response.success
            ? `Round saved.${typeof xp === 'number' ? ` +${xp} XP.` : ''}`
            : 'Your round did not save. Check your connection before trying again.',
        });
      } catch {
        setSummary({
          ...base,
          message: 'Your round did not save. Check your connection before trying again.',
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
      const instance = createDefenseGame(
        canvas.current,
        content,
        (round) => {
          void saveRound(round);
        },
        setStatus,
        () => setReady(true),
        () =>
          setError(
            'The battlefield art could not load. Check your connection, then prepare the defense again.',
          ),
      );
      game.current = instance;
      return () => {
        instance.destroy();
        game.current = null;
      };
    } catch {
      queueMicrotask(() =>
        setError('This browser cannot display the battlefield. Try another browser.'),
      );
    }
  }, [content, saveRound]);
  useEffect(() => {
    game.current?.setSound(sound);
  }, [sound, content]);

  async function start() {
    setLoading(true);
    setError('');
    setSummary(null);
    setContent(null);
    setStatus(null);
    setReady(false);
    try {
      setContent(await prepareQuestStage(stage.belt));
    } catch {
      setError('Words could not load. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }
  function toggleMusic() {
    const next = !musicEnabled;
    setMusicEnabled(next);
    setMusicError(false);
    music.current?.setEnabled(next);
    canvas.current?.focus();
  }

  return (
    <div>
      {!content && (
        <section className={styles.briefing}>
          <div>
            <h2>Hold the street together.</h2>
            <p>
              Type the highlighted enemy word to send Mochi into action. Wrong keys do not advance
              the word or hurt the gate.
            </p>
            <p>
              Three words without a typo earn a team attack, push enemies back, and give Miso a
              shield. Shields block incoming hits.
            </p>
            <p>
              Survive five short waves, then type three words to clear the boss. Words match your
              earned belt and focus keys.
            </p>
          </div>
          <div className={styles.mission}>
            <h3>Your first mission</h3>
            <p>
              One street. Two defenders.
              <br />
              Three enemy types and a boss.
            </p>
            <p>Use a physical keyboard. Click away to pause, including between waves.</p>
            <button className="btn btn-primary" disabled={loading} onClick={() => void start()}>
              {loading ? 'Preparing words…' : 'Prepare the defense'}
            </button>
          </div>
        </section>
      )}
      {content && (
        <>
          <div className={styles.toolbar}>
            <p>
              {content.source === 'ai' ? 'AI-picked words' : 'Local word pool (fallback)'}
              {content.focusKeys.length ? ` · Focus keys: ${content.focusKeys.join(' ')}` : ''}
            </p>
            <div className={styles.controls}>
              <button
                className="btn btn-secondary"
                aria-pressed={sound}
                onClick={() => setSound(!sound)}
              >
                Effects {sound ? 'on' : 'off'}
              </button>
              <button
                className="btn btn-secondary"
                aria-pressed={musicEnabled}
                disabled={!ready || !!error}
                onClick={toggleMusic}
              >
                Music {musicEnabled ? 'on' : 'off'}
              </button>
              <label>
                Music volume
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  aria-valuetext={`${volume}%`}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setVolume(value);
                    music.current?.setVolume(value / 100);
                  }}
                />
              </label>
            </div>
          </div>
          {musicError && (
            <p role="status">
              Music could not start. You can keep playing or toggle music to retry.
            </p>
          )}
          {!ready && !error && <p role="status">Bringing your defenders to the street…</p>}
          <canvas
            ref={canvas}
            width={1024}
            height={576}
            tabIndex={0}
            className={styles.canvas}
            role="img"
            aria-label="Dojo Defense keyboard game"
            aria-describedby="defense-help defense-status"
            onBlur={() => music.current?.setActive(false)}
          />
          <p id="defense-help" className={styles.help}>
            Click the battlefield, then press Enter. Type the highlighted word exactly. Press Enter
            between waves. Click away to pause. Music starts only when you turn it on.
          </p>
          <div id="defense-status" className={styles.status}>
            <p>
              Gate {status?.health ?? 100}/100 · Shields {status?.shields ?? 0}/2 ·{' '}
              {status?.cleared ?? 0}/18 words cleared
            </p>
            <p>
              {status?.word ? (
                <>
                  Type: <strong>{status.word}</strong> · Next letters:{' '}
                  <strong>{status.word.slice(status.typed)}</strong> · {Math.ceil(status.remaining)}{' '}
                  seconds
                </>
              ) : (
                'Ready when you are.'
              )}
            </p>
          </div>
          <p className={styles.announcement} role="status">
            {status?.phase === 'won' || status?.phase === 'lost'
              ? 'Round complete. Your summary is below.'
              : status?.phase === 'between'
                ? status.wave === 5
                  ? 'The boss is next. Press Enter when ready.'
                  : `Wave ${status.wave} complete. Press Enter when ready.`
                : status?.paused
                  ? 'Paused. Focus the battlefield to continue.'
                  : status?.phase === 'playing'
                    ? status.wave > 5
                      ? 'Boss wave.'
                      : `Wave ${status.wave} of 5.`
                    : ready
                      ? 'Press Enter to start.'
                      : ''}
          </p>
        </>
      )}
      {error && (
        <div role="alert">
          <p>{error}</p>
          {content && (
            <button className="btn btn-secondary" disabled={loading} onClick={() => void start()}>
              Prepare again
            </button>
          )}
        </div>
      )}
      {saving && <p role="status">Saving your round…</p>}
      {summary && (
        <section className={styles.summary} aria-live="polite">
          <h2>{summary.won ? 'The dojo is safe.' : 'Rest, then regroup.'}</h2>
          <p>
            {summary.words} words cleared · {Math.round(summary.wpm)} WPM ·{' '}
            {Math.round(summary.accuracy)}% accuracy
          </p>
          <p>{summary.message}</p>
          <button className="btn btn-primary" disabled={loading} onClick={() => void start()}>
            Defend again
          </button>
        </section>
      )}
      <footer className={styles.credit}>
        <p>
          Art:{' '}
          <a
            href="https://craftpix.net/freebies/free-cartoon-cat-defense-game-asset-kit/"
            target="_blank"
            rel="noreferrer"
          >
            Cartoon Cat Defense kit
          </a>{' '}
          by CraftPix, used with permission.
        </p>
        <p>
          Music and hit effect: Ninja Adventure by Pixel-Boy and AAA (CC0).{' '}
          <a href="/dojo-quest/ASSET-CREDITS.md">Track credits</a>.
        </p>
      </footer>
    </div>
  );
}
