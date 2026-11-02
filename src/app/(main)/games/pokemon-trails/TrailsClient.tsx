'use client';

/* eslint-disable @next/next/no-img-element -- Pixel sprites use native picture for reduced-motion sources. */
import { useEffect, useRef, useState } from 'react';
import {
  applyTrailInput,
  createTrailBattle,
  isPokemonFamily,
  POKEMON_INFO,
  POKEMON_LINES,
  pokemonForm,
  pokemonName,
  STARTERS,
  trailFinished,
} from '@/domains/typing/pokemon';
import type {
  PokemonCollection,
  PokemonEncounter,
  PokemonFamily,
  PokemonSpecies,
  TrailBattle,
  TrailInput,
} from '@/domains/typing/pokemon';
import type { TrailReceipt } from '@/lib/aws/repositories/pokemon.repository';
import {
  changeTrailPartner,
  chooseTrailStarter,
  finishTrailEncounter,
  leaveTrailEncounter,
  prepareTrailEncounter,
} from './actions';
import styles from './trails.module.css';

function Sprite({
  species,
  back = false,
  animated = false,
  className = '',
}: {
  species: PokemonSpecies;
  back?: boolean;
  animated?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const still = `/pokemon-trails/${back ? 'back' : 'front'}/${species}.png`;
  return (
    <picture className={`${styles.sprite} ${className}`}>
      <source media="(prefers-reduced-motion: reduce)" srcSet={still} />
      <img
        width={180}
        height={180}
        alt={pokemonName(species)}
        draggable={false}
        src={
          animated && !failed
            ? `/pokemon-trails/${back ? 'animated-back' : 'animated'}/${species}.gif`
            : still
        }
        onError={() => setFailed(true)}
      />
    </picture>
  );
}

export default function TrailsClient({
  initialCollection,
}: {
  initialCollection: PokemonCollection | null;
}) {
  const [collection, setCollection] = useState(initialCollection);
  const [encounter, setEncounter] = useState<PokemonEncounter | null>(null);
  const [battle, setBattle] = useState<TrailBattle | null>(null);
  const [receipt, setReceipt] = useState<TrailReceipt | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [paused, setPaused] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [flash, setFlash] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const inputs = useRef<TrailInput[]>([]);
  const clock = useRef({ elapsed: 0, start: null as number | null });
  const saving = useRef(false);
  const current = useRef<TrailBattle | null>(null);
  const partner = collection?.partner ?? 'bulbasaur';
  const training = collection?.caught[partner] ?? 0;
  const form = pokemonForm(partner, training);

  function pauseClock() {
    if (clock.current.start !== null) {
      clock.current.elapsed += performance.now() - clock.current.start;
      clock.current.start = null;
    }
    setPaused(true);
  }
  function resumeClock() {
    if (clock.current.start === null) clock.current.start = performance.now();
    setPaused(false);
  }
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) input.current?.blur();
    };
    document.addEventListener('visibilitychange', hidden);
    return () => document.removeEventListener('visibilitychange', hidden);
  }, []);
  useEffect(() => {
    if (!encounter || receipt) return;
    const protect = (event: BeforeUnloadEvent) => {
      if (inputs.current.length) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, [encounter, receipt]);
  useEffect(() => {
    if (encounter) input.current?.focus();
  }, [encounter]);

  async function selectStarter(family: PokemonFamily) {
    setBusy(true);
    setError('');
    try {
      setCollection(await chooseTrailStarter(family));
    } catch {
      setError(
        'Your partner could not be saved. Try again; your first choice will only be saved once.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function explore(guardian = false) {
    setBusy(true);
    setError('');
    setReceipt(null);
    try {
      const next = await prepareTrailEncounter(guardian);
      if (!next.active) throw new Error('No encounter.');
      setCollection(next);
      setEncounter(next.active);
      const initial = createTrailBattle(next.active);
      current.current = initial;
      setBattle(initial);
      inputs.current = [];
      clock.current = { elapsed: 0, start: null };
      setLeaving(false);
    } catch {
      setError(
        'The encounter could not start. If an old encounter expired, leave it below and try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function save(finishedInputs: TrailInput[] = inputs.current) {
    if (!encounter || saving.current || receipt) return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await finishTrailEncounter(encounter.id, finishedInputs);
      setCollection(result.collection);
      setReceipt(result.receipt);
    } catch {
      setError(
        'The save did not finish. Retry the save before leaving; retries cannot duplicate your rewards.',
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  function record(kind: 'key' | 'guard', key = '') {
    if (!encounter || !current.current || trailFinished(current.current) || busy) return;
    if (inputs.current.length >= 2500) {
      setError(
        'This encounter has too many inputs to save. Leave it and try again with slower, careful typing.',
      );
      return;
    }
    const at = Math.round(
      clock.current.elapsed +
        (clock.current.start === null ? 0 : performance.now() - clock.current.start),
    );
    const event: TrailInput = kind === 'guard' ? { kind, at } : { kind, key, at };
    try {
      const next = applyTrailInput(current.current, encounter, event);
      inputs.current = [...inputs.current, event];
      if (next.turns !== current.current.turns) {
        setFlash(true);
        window.setTimeout(() => setFlash(false), 350);
      }
      current.current = next;
      setBattle(next);
      if (trailFinished(next)) {
        pauseClock();
        void save(inputs.current);
      }
    } catch {
      setError('Guard is available before the first letter of a turn.');
    }
  }
  async function leave(id = encounter?.id ?? collection?.active?.id) {
    if (!id) return;
    setBusy(true);
    setError('');
    try {
      setCollection(await leaveTrailEncounter(id));
      setEncounter(null);
      setBattle(null);
      current.current = null;
      inputs.current = [];
      setLeaving(false);
      setReceipt(null);
    } catch {
      setError(
        'The encounter changed in another tab or could not be left. Reload the trail to continue.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function selectPartner(family: PokemonFamily) {
    setBusy(true);
    setError('');
    try {
      setCollection(await changeTrailPartner(family));
    } catch {
      setError('Finish or leave your current encounter before changing partners.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
      {!collection ? (
        <section className={styles.onboarding}>
          <div className={styles.introduction}>
            <h2>
              Every trail starts
              <br />
              with a friend.
            </h2>
            <p>
              Choose your first partner. Type real practice words to power their moves, meet wild
              Pokémon, and fill your field guide.
            </p>
            <p className={styles.quiet}>
              All three are equally good choices. There is no time limit, and your first battle is a
              gentle introduction.
            </p>
          </div>
          <div className={styles.starters}>
            {STARTERS.map((family) => (
              <button
                key={family}
                type="button"
                className={styles.starter}
                disabled={busy}
                onClick={() => void selectStarter(family)}
              >
                <Sprite species={family} />
                <span className={styles.type}>{POKEMON_INFO[family].type}</span>
                <strong>{POKEMON_INFO[family].name}</strong>
                <span>{POKEMON_INFO[family].description}</span>
                <span className={styles.choose}>
                  {busy ? 'Saving choice…' : `Choose ${POKEMON_INFO[family].name}`}
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : encounter && battle ? (
        <div className={styles.adventure}>
          <section className={styles.battleCard} aria-label="Meadow encounter">
            <div className={styles.scene}>
              <div className={styles.sceneTitle}>
                {encounter.guardian
                  ? 'The meadow guardian'
                  : encounter.tutorial
                    ? 'Your first encounter'
                    : 'A wild encounter'}
                <span>Meadow Trail</span>
              </div>
              <div className={styles.opponentStatus}>
                <strong>
                  {encounter.guardian ? 'Pidgeotto' : POKEMON_INFO[encounter.opponent].name}
                </strong>
                <label>
                  HP{' '}
                  <span>
                    {battle.opponentHp} / {battle.maxOpponentHp}
                  </span>
                  <progress max={battle.maxOpponentHp} value={battle.opponentHp} />
                </label>
              </div>
              <Sprite
                species={encounter.guardian ? 'pidgeotto' : pokemonForm(encounter.opponent, 0)}
                animated={!trailFinished(battle)}
                className={`${styles.opponent} ${flash ? styles.hit : ''}`}
              />
              <Sprite
                species={form}
                back
                animated={!trailFinished(battle)}
                className={styles.partner}
              />
              <div className={styles.partnerStatus}>
                <strong>
                  {pokemonName(form)} <span>Lv. {Math.min(10, training + 1)}</span>
                </strong>
                <label>
                  HP <span>{battle.playerHp} / 100</span>
                  <progress max={100} value={battle.playerHp} />
                </label>
              </div>
              {battle.phase === 'caught' && (
                <div className={styles.captureSeal} aria-hidden="true">
                  Caught!
                </div>
              )}
            </div>
            <div className={styles.console}>
              <p className={styles.message} role="status">
                {battle.message}
              </p>
              {!trailFinished(battle) ? (
                <>
                  <div className={styles.move}>
                    <strong>
                      {battle.phase === 'capture'
                        ? 'Capture challenge'
                        : battle.guarding
                          ? 'Guard'
                          : POKEMON_INFO[partner].move}
                    </strong>
                    <span>
                      {battle.phase === 'capture'
                        ? '90% accuracy to catch'
                        : 'Accuracy gives your move more power'}
                    </span>
                  </div>
                  <div className={styles.prompt} aria-hidden="true">
                    {[...battle.prompt].map((char, i) => (
                      <span
                        key={i}
                        className={
                          i < battle.cursor
                            ? styles.typed
                            : i === battle.cursor
                              ? styles.cursor
                              : ''
                        }
                      >
                        {char === ' ' ? '\u00a0' : char}
                      </span>
                    ))}
                  </div>
                  <label className={styles.inputLabel} htmlFor="trail-typing">
                    {paused
                      ? 'Tap here to focus, then type the words above.'
                      : 'Type each letter and the space between words. Mistakes do not erase your progress.'}
                  </label>
                  <input
                    id="trail-typing"
                    ref={input}
                    className={styles.typingInput}
                    value=""
                    aria-label={`Type: ${battle.prompt}`}
                    aria-describedby="trail-input-help"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    disabled={busy}
                    onFocus={resumeClock}
                    onBlur={pauseClock}
                    onPaste={(event) => event.preventDefault()}
                    onDrop={(event) => event.preventDefault()}
                    onKeyDown={(event) => {
                      if (
                        event.ctrlKey ||
                        event.metaKey ||
                        event.altKey ||
                        event.nativeEvent.isComposing
                      )
                        return;
                      if (event.key.length === 1 && !event.repeat) {
                        event.preventDefault();
                        record('key', event.key);
                      } else if (event.key === 'Backspace') event.preventDefault();
                    }}
                    onChange={(event) => {
                      if (/^[\x20-\x7e]$/.test(event.target.value))
                        record('key', event.target.value);
                    }}
                    placeholder={paused ? 'Focus the typing field' : 'Your keyboard is ready'}
                  />
                  <p id="trail-input-help" className={styles.quiet}>
                    No countdown. Looking away never costs health.{' '}
                    {encounter.tutorial && 'Your partner takes no damage in this first encounter.'}
                  </p>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.secondary}
                      disabled={
                        busy ||
                        battle.phase !== 'battle' ||
                        !battle.guards ||
                        !!battle.cursor ||
                        !!battle.promptAttempts ||
                        battle.guarding
                      }
                      onClick={() => {
                        record('guard');
                        input.current?.focus();
                      }}
                    >
                      Guard · {battle.guards} left
                    </button>
                    <button
                      type="button"
                      className={styles.textButton}
                      disabled={busy}
                      onClick={() => setLeaving(true)}
                    >
                      Leave encounter
                    </button>
                  </div>
                </>
              ) : (
                <div className={styles.result}>
                  <h2>
                    {busy
                      ? 'Saving your adventure…'
                      : receipt
                        ? 'Practice worth keeping.'
                        : 'Your encounter is complete.'}
                  </h2>
                  {receipt ? (
                    <>
                      <div className={styles.metrics}>
                        <div>
                          <strong>+{receipt.xp}</strong>
                          <span>platform XP</span>
                        </div>
                        <div>
                          <strong>{receipt.accuracy}%</strong>
                          <span>accuracy</span>
                        </div>
                        <div>
                          <strong>{receipt.wpm}</strong>
                          <span>WPM</span>
                        </div>
                      </div>
                      <p>
                        {receipt.caught
                          ? `${POKEMON_INFO[receipt.caught].name} is in your field guide. `
                          : ''}
                        Your partner completed another training encounter. Progress is saved.
                      </p>
                      {receipt.evolved && (
                        <p className={styles.evolution}>
                          Your partner evolved into {pokemonName(receipt.evolved)}!
                        </p>
                      )}
                      {receipt.guardian && receipt.won && (
                        <p>
                          The meadow badge is yours. Other starter Pokémon can now appear on the
                          trail.
                        </p>
                      )}
                      <button
                        className={styles.primary}
                        type="button"
                        onClick={() => {
                          setEncounter(null);
                          setBattle(null);
                          setReceipt(null);
                          inputs.current = [];
                        }}
                      >
                        Return to camp
                      </button>
                    </>
                  ) : (
                    <button
                      className={styles.primary}
                      disabled={busy}
                      type="button"
                      onClick={() => void save()}
                    >
                      {busy ? 'Saving…' : 'Retry save'}
                    </button>
                  )}
                </div>
              )}
              {leaving && (
                <div className={styles.leaveBox} role="alert">
                  <p>
                    Leave without saving this encounter? Your existing collection and earned XP are
                    safe, but this attempt will not count.
                  </p>
                  <button
                    type="button"
                    className={styles.secondary}
                    disabled={busy}
                    onClick={() => void leave()}
                  >
                    Leave without rewards
                  </button>
                  <button
                    type="button"
                    className={styles.textButton}
                    onClick={() => {
                      setLeaving(false);
                      input.current?.focus();
                    }}
                  >
                    Keep exploring
                  </button>
                </div>
              )}
            </div>
          </section>
          <aside className={styles.notebook}>
            <span className={styles.notebookIcon} aria-hidden="true">
              ✦
            </span>
            <h2>
              Slow is a good
              <br />
              place to start.
            </h2>
            <p>
              Complete the words to attack. Clean turns add power; every third clean turn gives a
              focus move.
            </p>
            <dl>
              <div>
                <dt>Clean turns in a row</dt>
                <dd>{battle.combo}</dd>
              </div>
              <div>
                <dt>Turns completed</dt>
                <dd>{battle.turns}</dd>
              </div>
              <div>
                <dt>Partner training</dt>
                <dd>{training} encounters</dd>
              </div>
            </dl>
            <p className={styles.quiet}>
              Guard before typing a turn to recover health and soften the next hit. Your Pokémon
              never disappears if you lose.
            </p>
          </aside>
        </div>
      ) : (
        <>
          <section className={styles.camp}>
            <div className={styles.campCopy}>
              <span className={styles.location}>Meadow Trail</span>
              <h2>
                A small trail.
                <br />A big beginning.
              </h2>
              <p>
                A river to follow, new friends to find. Your next encounter is just a few careful
                words away.
              </p>
              <button
                type="button"
                className={styles.primary}
                disabled={busy}
                onClick={() => void explore()}
              >
                {busy
                  ? 'Preparing the trail…'
                  : collection.active
                    ? 'Resume encounter'
                    : collection.wins
                      ? 'Explore the meadow'
                      : 'Meet your first wild Pokémon'}
              </button>
            </div>
            <div className={styles.campPartner}>
              <Sprite species={form} animated />
              <span>
                {pokemonName(form)} · Lv. {Math.min(10, training + 1)}
              </span>
            </div>
            <div className={styles.trailMarkers} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </section>
          {collection.active && (
            <div className={styles.resumeNote}>
              <p>
                An unfinished encounter is waiting. Resuming restarts its typing, not your saved
                collection.
              </p>
              <button
                type="button"
                className={styles.textButton}
                disabled={busy}
                onClick={() => setLeaving(true)}
              >
                Leave unfinished encounter
              </button>
              {leaving && (
                <div className={styles.leaveBox}>
                  <p>This attempt will not earn rewards. Already-saved progress is safe.</p>
                  <button className={styles.secondary} disabled={busy} onClick={() => void leave()}>
                    Confirm leave
                  </button>
                  <button className={styles.textButton} onClick={() => setLeaving(false)}>
                    Keep it
                  </button>
                </div>
              )}
            </div>
          )}
          <div className={styles.campDetails}>
            <section className={styles.fieldGuide}>
              <div className={styles.sectionHeading}>
                <div>
                  <h2>Your field guide</h2>
                  <p>Five friendships. Fifteen forms to discover.</p>
                </div>
                <span>
                  {Object.entries(collection.caught).reduce(
                    (sum, [family, count]) =>
                      sum +
                      ((count ?? 0) >= 9
                        ? 3
                        : (count ?? 0) >= 4
                          ? 2
                          : isPokemonFamily(family)
                            ? 1
                            : 0),
                    0,
                  )}{' '}
                  / 15
                </span>
              </div>
              {(Object.keys(POKEMON_LINES) as PokemonFamily[]).map((family) => {
                const count = collection.caught[family];
                const owned = count !== undefined;
                const stage = !owned ? -1 : count >= 9 ? 2 : count >= 4 ? 1 : 0;
                return (
                  <div
                    className={`${styles.collectionRow} ${family === collection.partner ? styles.activePartner : ''}`}
                    key={family}
                  >
                    <div className={styles.evolutionLine}>
                      {POKEMON_LINES[family].map((species, index) => (
                        <div key={species} className={index > stage ? styles.undiscovered : ''}>
                          <img
                            src={`/pokemon-trails/icons/${species}.png`}
                            alt={index <= stage ? pokemonName(species) : 'Undiscovered form'}
                            width={68}
                            height={56}
                            loading="lazy"
                          />
                          <span>{index <= stage ? pokemonName(species) : '???'}</span>
                        </div>
                      ))}
                    </div>
                    <div className={styles.collectionAction}>
                      {owned ? (
                        <>
                          <span>
                            {count < 4
                              ? `${4 - count} more encounters to evolve`
                              : count < 9
                                ? `${9 - count} more encounters to evolve`
                                : 'Fully evolved'}
                          </span>
                          <button
                            type="button"
                            className={styles.textButton}
                            disabled={busy || !!collection.active || family === partner}
                            onClick={() => void selectPartner(family)}
                          >
                            {family === partner ? 'Your partner' : 'Make partner'}
                          </button>
                        </>
                      ) : (
                        <span>
                          {STARTERS.includes(family)
                            ? 'Available after the guardian'
                            : 'Discover in the meadow'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
            <aside className={styles.guardian}>
              <span className={styles.badgeShape} aria-hidden="true">
                {collection.guardian ? '✓' : '◇'}
              </span>
              <h2>
                {collection.guardian ? 'A trail well travelled.' : 'Someone is watching the trail.'}
              </h2>
              <Sprite species="pidgeotto" />
              <p>
                {collection.guardian
                  ? 'Your meadow badge is earned. Keep training your partners or return for another challenge.'
                  : 'Pidgeotto guards the meadow. Win three encounters, then show how much your accuracy has grown.'}
              </p>
              <p className={styles.quiet}>
                {collection.wins} encounters won ·{' '}
                {collection.guardian
                  ? 'Meadow badge earned'
                  : `${Math.max(0, 3 - collection.wins)} wins until the challenge`}
              </p>
              <button
                type="button"
                className={styles.secondary}
                disabled={busy || !!collection.active || collection.wins < 3}
                onClick={() => void explore(true)}
              >
                {collection.guardian
                  ? 'Challenge again'
                  : collection.wins < 3
                    ? 'Guardian not yet available'
                    : 'Meet the guardian'}
              </button>
              <p className={styles.quiet}>
                More habitats are planned. This first trail is open to every belt; words always
                match yours.
              </p>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
