'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { QuestContent, QuestStage } from '@/domains/typing/quest';
import { TypingEvaluator } from '@/domains/typing/evaluator';
import { submitPracticeSession } from '@/app/(main)/practice/actions';
import { prepareQuestStage } from './actions';
import { createQuestGame } from './quest-engine';
import { createDuelGame } from './duel-engine';
import { createStageMusic } from './stage-music';
import type { QuestRound, QuestStatus } from './quest-engine';
import styles from './quest.module.css';

export default function QuestClient({
  stage,
  studentId,
  mode = 'quest',
}: {
  stage: QuestStage;
  studentId: string;
  mode?: 'quest' | 'duel';
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const game = useRef<ReturnType<typeof createQuestGame> | null>(null);
  const music = useRef<ReturnType<typeof createStageMusic> | null>(null);
  const [content, setContent] = useState<QuestContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [sound, setSound] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [musicVolume, setMusicVolume] = useState(25);
  const [musicUnavailable, setMusicUnavailable] = useState(false);
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
  const exerciseId = mode === 'duel' ? 'game-dojo-duel' : `game-dojo-quest-${stage.belt}`;

  useEffect(() => {
    const instance = createStageMusic(stage.setting, () => {
      setMusicEnabled(false);
      setMusicUnavailable(true);
    });
    music.current = instance;
    return () => {
      instance.destroy();
      music.current = null;
    };
  }, [stage.setting]);

  useEffect(() => {
    const instance = music.current;
    const scene =
      mode === 'duel'
        ? 'duel'
        : status?.phase === 'boss' || status?.phase === 'bossIntro'
          ? 'boss'
          : 'stage';
    const sync = () => {
      const active =
        !!content &&
        ready &&
        !saving &&
        !summary &&
        !document.hidden &&
        document.activeElement === canvas.current;
      if (!active) instance?.setActive(false);
      instance?.setScene(scene);
      if (active) instance?.setActive(true);
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, [content, ready, mode, status?.phase, status?.paused, saving, summary]);

  const saveRound = useCallback(
    async (round: QuestRound) => {
      const result = new TypingEvaluator().evaluate({
        studentId,
        exerciseId,
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
          exerciseId,
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
    [studentId, stage.belt, exerciseId],
  );

  useEffect(() => {
    if (!content || !canvas.current) return;
    try {
      const callbacks = [
        (round) => {
          void saveRound(round);
        },
        setStatus,
        () => setReady(true),
        () => setError('Game art could not load. Reload the page to try again.'),
      ] as const satisfies [
        (round: QuestRound) => void,
        (status: QuestStatus) => void,
        () => void,
        () => void,
      ];
      const instance =
        mode === 'duel'
          ? createDuelGame(canvas.current, content, ...callbacks)
          : createQuestGame(canvas.current, stage, content, ...callbacks);
      game.current = instance;
      return () => {
        instance.destroy();
        game.current = null;
      };
    } catch {
      // Report asynchronously, like the image-loading callbacks.
      queueMicrotask(() => setError('This browser cannot display the game. Try another browser.'));
    }
  }, [content, stage, saveRound, mode]);

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

  function toggleMusic() {
    const next = !musicEnabled;
    setMusicUnavailable(false);
    setMusicEnabled(next);
    music.current?.setEnabled(next);
    if (next) canvas.current?.focus();
  }

  return (
    <div>
      {!content && (
        <section className={styles.instructions}>
          <h2>{mode === 'duel' ? 'Meet Crimson in the courtyard.' : 'Accuracy opens the gate.'}</h2>
          {mode === 'duel' ? (
            <>
              <p>
                Finish the word to strike before Crimson attacks. Accurate words build your combo
                and earn focus gems.
              </p>
              <p>
                Collect three gems, then finish another word without a typo to unleash a focus
                strike. Typos break your combo, but do not cost health.
              </p>
              <p>This is a single-player sparring prototype. No fighting-game experience needed.</p>
            </>
          ) : (
            <>
              <p>
                Your first letter locks a creature. Finish its word before it reaches you. Three
                hits end the round.
              </p>
              <p>
                The boss scroll needs every character, including spaces, capitals, and punctuation.
                Wrong keys do not advance it.
              </p>
            </>
          )}
          <p>Click away to pause. Use a physical keyboard and a wider screen for the best view.</p>
          <button className="btn btn-primary" disabled={loading} onClick={() => void start()}>
            {loading
              ? 'Preparing your words…'
              : mode === 'duel'
                ? 'Prepare sparring match'
                : 'Prepare stage'}
          </button>
        </section>
      )}
      {content && (
        <>
          <div className={styles.toolbar}>
            <p>
              {content.source === 'ai'
                ? mode === 'duel'
                  ? 'AI-picked words'
                  : 'AI-picked words and scroll'
                : mode === 'duel'
                  ? 'Local word pool (fallback)'
                  : 'Local word pool and scroll (fallback)'}
              {content.focusKeys.length > 0 ? ` · Focus keys: ${content.focusKeys.join(' ')}` : ''}
            </p>
            <div className={styles.audioControls}>
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
                disabled={!ready}
                onClick={toggleMusic}
              >
                Music {musicEnabled ? 'on' : 'off'}
              </button>
              <label className={styles.volume}>
                Music volume
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={musicVolume}
                  aria-valuetext={`${musicVolume}%`}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setMusicVolume(value);
                    music.current?.setVolume(value / 100);
                  }}
                />
              </label>
            </div>
          </div>
          {musicUnavailable && (
            <p role="status" className={styles.note}>
              Music could not start. You can keep playing, or turn music on to retry.
            </p>
          )}
          {!ready && !error && (
            <p role="status">Loading the {mode === 'duel' ? 'arena' : 'stage'}…</p>
          )}
          <canvas
            ref={canvas}
            width={768}
            height={432}
            tabIndex={0}
            className={styles.canvas}
            role="img"
            aria-label={
              mode === 'duel' ? 'Dojo sparring keyboard game' : 'Dojo Quest keyboard game'
            }
            aria-describedby="quest-help quest-status"
            onFocus={() =>
              music.current?.setActive(ready && !saving && !summary && !document.hidden)
            }
            onBlur={() => music.current?.setActive(false)}
          />
          <p id="quest-help" className={styles.note}>
            Click the game, then press Enter.{' '}
            {mode === 'duel' ? 'Finish each word to attack.' : 'Type creature words exactly.'} Click
            away to pause. Music is off until you turn it on.
          </p>
          <div id="quest-status" className={styles.status}>
            <span>
              {status?.duel
                ? `You: ${status.duel.playerHp}/100 health. Crimson: ${status.duel.rivalHp}/120. Combo: ${status.duel.combo}. Focus gems: ${status.duel.gems}/3.`
                : status
                  ? `Hearts: ${status.hearts}/3. Cleared: ${status.cleared}/${stage.waveSize}.`
                  : 'Ready when the art loads.'}
            </span>
            {status?.duel && status.phase === 'play' && (
              <p>Next attack in {Math.ceil(status.duel.remaining)} seconds.</p>
            )}
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
          <h2>
            {summary.won
              ? mode === 'duel'
                ? 'Well sparred.'
                : 'Stage clear.'
              : 'Rest, then return.'}
          </h2>
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
        Art, effects, and music:{' '}
        <a
          href="https://pixel-boy.itch.io/ninja-adventure-asset-pack"
          target="_blank"
          rel="noreferrer"
        >
          Ninja Adventure
        </a>{' '}
        by Pixel-Boy and AAA (<a href="/dojo-quest/LICENSE-ninja-adventure.txt">CC0</a>).{' '}
        <a href="/dojo-quest/ASSET-CREDITS.md">Track credits</a>.
      </p>
    </div>
  );
}
