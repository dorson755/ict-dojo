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
  trainingToEvolve,
  trailFinished,
  trailCounterDamage,
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
import { trailElement, trailFeedback } from './trail-feedback';
import type { TrailFeedback } from './trail-feedback';
import {
  DEFAULT_TRAIL_MUSIC,
  DEFAULT_TRAIL_SOUND,
  readTrailMusic,
  readTrailSound,
  TrailAudio,
  writeTrailMusic,
  writeTrailSound,
} from './trail-audio';
import type { TrailMusicPreferences, TrailSoundPreferences } from './trail-audio';

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

const POKEDEX_ENTRIES = (
  Object.entries(POKEMON_LINES) as [PokemonFamily, readonly PokemonSpecies[]][]
)
  .flatMap(([family, line]) =>
    line.map((species, evolutionIndex) => ({ family, species, evolutionIndex })),
  )
  .map((entry, index) => ({ ...entry, dexNumber: index + 1 }));
const POKEDEX_PAGE_SIZE = 20;

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
  const [feedback, setFeedback] = useState<(TrailFeedback & { id: number }) | null>(null);
  const feedbackId = useRef(0);
  const audio = useRef<TrailAudio | null>(null);
  const [sound, setSound] = useState<TrailSoundPreferences>(DEFAULT_TRAIL_SOUND);
  const [music, setMusic] = useState<TrailMusicPreferences>(DEFAULT_TRAIL_MUSIC);
  const [soundUnavailable, setSoundUnavailable] = useState(false);
  const [musicUnavailable, setMusicUnavailable] = useState(false);
  const [guideSearch, setGuideSearch] = useState('');
  const [guideOwned, setGuideOwned] = useState(false);
  const [guidePage, setGuidePage] = useState(0);
  const [selectedGuideSpecies, setSelectedGuideSpecies] = useState<PokemonSpecies | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const inputs = useRef<TrailInput[]>([]);
  const clock = useRef({ elapsed: 0, start: null as number | null });
  const saving = useRef(false);
  const current = useRef<TrailBattle | null>(null);
  const partner = collection?.partner ?? 'bulbasaur';
  const training = collection?.caught[partner] ?? 0;
  const form = pokemonForm(partner, training);
  const element = trailElement(POKEMON_INFO[partner].type);
  const guideEntries = POKEDEX_ENTRIES.filter(({ family, species, evolutionIndex }) => {
    const count = collection?.caught[family];
    const stage =
      count === undefined
        ? -1
        : POKEMON_LINES[family].findIndex((form) => form === pokemonForm(family, count));
    const discovered = evolutionIndex <= stage;
    return (
      (!guideOwned || discovered) &&
      pokemonName(species).toLowerCase().includes(guideSearch.trim().toLowerCase())
    );
  });
  const guidePageCount = Math.ceil(guideEntries.length / POKEDEX_PAGE_SIZE);
  const currentGuidePage = Math.min(guidePage, Math.max(0, guidePageCount - 1));
  const visibleGuideEntries = guideEntries.slice(
    currentGuidePage * POKEDEX_PAGE_SIZE,
    (currentGuidePage + 1) * POKEDEX_PAGE_SIZE,
  );
  const selectedGuideEntry =
    visibleGuideEntries.find((entry) => entry.species === selectedGuideSpecies) ??
    visibleGuideEntries[0];
  const guideEntryCount = Object.entries(collection?.caught ?? {}).reduce(
    (sum, [family, count]) =>
      sum +
      (isPokemonFamily(family) && count !== undefined
        ? POKEMON_LINES[family].findIndex((species) => species === pokemonForm(family, count)) + 1
        : 0),
    0,
  );
  const selectedGuideCount = selectedGuideEntry
    ? collection?.caught[selectedGuideEntry.family]
    : undefined;
  const selectedGuideStage =
    selectedGuideEntry && selectedGuideCount !== undefined
      ? POKEMON_LINES[selectedGuideEntry.family].findIndex(
          (species) => species === pokemonForm(selectedGuideEntry.family, selectedGuideCount),
        )
      : -1;
  const selectedGuideDiscovered =
    selectedGuideEntry !== undefined && selectedGuideEntry.evolutionIndex <= selectedGuideStage;
  const selectedGuideRemaining = selectedGuideEntry
    ? trainingToEvolve(selectedGuideEntry.family, selectedGuideCount ?? 0)
    : null;

  function pauseClock() {
    if (clock.current.start !== null) {
      clock.current.elapsed += performance.now() - clock.current.start;
      clock.current.start = null;
    }
    setPaused(true);
    if (!current.current || !trailFinished(current.current)) audio.current?.pause();
  }
  function resumeClock() {
    if (clock.current.start === null) clock.current.start = performance.now();
    setPaused(false);
    void audio.current?.unlock();
  }
  useEffect(() => {
    const player = new TrailAudio();
    audio.current = player;
    const preferences = readTrailSound();
    player.configure(preferences);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore browser preferences only after hydration.
    setSound(preferences);
    const musicPreferences = readTrailMusic();
    player.configureMusic(musicPreferences);
    setMusic(musicPreferences);
    return () => {
      player.destroy();
      audio.current = null;
    };
  }, []);
  useEffect(() => {
    audio.current?.setMusicActive(!!encounter && !receipt && !paused);
  }, [encounter, paused, receipt]);
  async function toggleSound() {
    const preferences = { ...sound, enabled: !sound.enabled };
    setSound(preferences);
    writeTrailSound(preferences);
    audio.current?.configure(preferences);
    setSoundUnavailable(false);
    if (preferences.enabled) {
      const ready = await audio.current?.unlock();
      if (ready) audio.current?.play({ cue: 'word', damage: 0, counter: 0 }, element);
      else setSoundUnavailable(true);
    }
  }
  async function toggleMusic() {
    const preferences = { ...music, enabled: !music.enabled };
    setMusic(preferences);
    writeTrailMusic(preferences);
    audio.current?.configureMusic(preferences);
    setMusicUnavailable(false);
    if (preferences.enabled) {
      const ready = await audio.current?.unlock();
      if (!ready) setMusicUnavailable(true);
    }
  }
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) {
        input.current?.blur();
        audio.current?.pause();
      }
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
    void audio.current?.unlock();
    audio.current?.stop();
    audio.current?.setMusicActive(false);
    setFeedback(null);
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
      const previous = current.current;
      const next = applyTrailInput(previous, encounter, event);
      inputs.current = [...inputs.current, event];
      const reaction = trailFeedback(previous, next, encounter);
      if (reaction) {
        audio.current?.play(reaction, element);
        if (reaction.cue !== 'word' && reaction.cue !== 'mistake')
          setFeedback({ ...reaction, id: ++feedbackId.current });
      }
      current.current = next;
      setBattle(next);
      if (trailFinished(next)) {
        // Stop the practice clock without cutting off the final attack or capture jingle.
        if (clock.current.start !== null) {
          clock.current.elapsed += performance.now() - clock.current.start;
          clock.current.start = null;
        }
        setPaused(true);
        audio.current?.setMusicActive(false);
        void save(inputs.current);
      }
    } catch {
      setError('Guard is available before the first letter of a turn.');
    }
  }
  async function leave(id = encounter?.id ?? collection?.active?.id) {
    if (!id) return;
    audio.current?.setMusicActive(false);
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
      setFeedback(null);
      audio.current?.stop();
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
      <div className={styles.soundControls} role="group" aria-label="Battle sound">
        <button
          type="button"
          className={styles.secondary}
          aria-pressed={sound.enabled}
          onClick={() => void toggleSound()}
        >
          Sound {sound.enabled ? 'on' : 'off'}
        </button>
        <label>
          Effects volume
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(sound.volume * 100)}
            disabled={!sound.enabled}
            onChange={(event) => {
              const preferences = { ...sound, volume: Number(event.target.value) / 100 };
              setSound(preferences);
              audio.current?.configure(preferences);
              writeTrailSound(preferences);
            }}
          />
        </label>
        <button
          type="button"
          className={styles.secondary}
          aria-pressed={music.enabled}
          onClick={() => void toggleMusic()}
        >
          Music {music.enabled ? 'on' : 'off'}
        </button>
        <label>
          Music volume
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(music.volume * 100)}
            disabled={!music.enabled}
            onChange={(event) => {
              const preferences = { ...music, volume: Number(event.target.value) / 100 };
              setMusic(preferences);
              audio.current?.configureMusic(preferences);
              writeTrailMusic(preferences);
            }}
          />
        </label>
        {soundUnavailable && (
          <span role="status">Sound is unavailable here. You can still play silently.</span>
        )}
        {musicUnavailable && (
          <span role="status">Music is unavailable here. You can still play silently.</span>
        )}
      </div>
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
                <div className={styles.hpLabel}>
                  HP{' '}
                  <span>
                    {battle.opponentHp} / {battle.maxOpponentHp}
                  </span>
                  <div
                    className={styles.hpTrack}
                    role="progressbar"
                    aria-label="Opponent HP"
                    aria-valuemin={0}
                    aria-valuemax={battle.maxOpponentHp}
                    aria-valuenow={battle.opponentHp}
                  >
                    <span
                      style={{ width: `${(100 * battle.opponentHp) / battle.maxOpponentHp}%` }}
                    />
                  </div>
                </div>
              </div>
              <div
                key={`opponent-${feedback?.id ?? 0}`}
                className={`${styles.opponent} ${feedback?.cue === 'attack' ? styles.opponentHit : ''} ${feedback?.counter ? styles.counterLunge : ''} ${battle.phase === 'caught' ? styles.captured : ''}`}
              >
                <Sprite
                  species={encounter.guardian ? 'pidgeotto' : pokemonForm(encounter.opponent, 0)}
                  animated={!trailFinished(battle)}
                />
              </div>
              <div
                key={`partner-${feedback?.id ?? 0}`}
                className={`${styles.partner} ${feedback?.cue === 'attack' ? styles.attackLunge : ''} ${feedback?.counter ? styles.partnerHit : ''}`}
              >
                <Sprite species={form} back animated={!trailFinished(battle)} />
              </div>
              {feedback && (
                <div
                  key={feedback.id}
                  className={styles.feedbackLayer}
                  aria-hidden="true"
                  data-feedback={feedback.cue}
                >
                  {feedback.cue === 'attack' && (
                    <>
                      <span className={`${styles.projectile} ${styles[element]}`} />
                      <span className={styles.outgoingDamage}>−{feedback.damage}</span>
                    </>
                  )}
                  {(battle.guarding || feedback.cue === 'guard') && (
                    <span
                      className={`${styles.shield} ${!battle.guarding ? styles.guardResolved : ''}`}
                    >
                      Guard
                    </span>
                  )}
                  {!!feedback.counter && (
                    <>
                      <span className={styles.counterProjectile} />
                      <span className={styles.incomingDamage}>−{feedback.counter}</span>
                    </>
                  )}
                  {feedback.cue === 'capture' && <span className={styles.captureBall} />}
                </div>
              )}
              {battle.guarding && !feedback && (
                <span className={styles.shield} aria-hidden="true">
                  Guard
                </span>
              )}
              <div className={styles.partnerStatus}>
                <strong>
                  {pokemonName(form)} <span>Lv. {Math.min(10, training + 1)}</span>
                </strong>
                <div className={styles.hpLabel}>
                  HP <span>{battle.playerHp} / 100</span>
                  <div
                    className={styles.hpTrack}
                    role="progressbar"
                    aria-label="Partner HP"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={battle.playerHp}
                  >
                    <span style={{ width: `${battle.playerHp}%` }} />
                  </div>
                </div>
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
                  {battle.phase === 'battle' && (
                    <div className={styles.counterMeter}>
                      <label>
                        Counterattack
                        <meter
                          min={0}
                          max={3}
                          value={
                            encounter.tutorial
                              ? 0
                              : Math.min(3, battle.promptAttempts - battle.cursor)
                          }
                          aria-label="Counterattack strength"
                        />
                      </label>
                      <span>
                        {encounter.tutorial
                          ? 'Practice only: no damage'
                          : encounter.rulesVersion !== 2
                            ? 'Original encounter: opponent responds each turn'
                            : battle.promptAttempts > battle.cursor
                              ? `${trailCounterDamage(encounter, battle.promptAttempts - battle.cursor, battle.guarding)} HP response when this turn ends`
                              : 'Clean turn: no counterattack'}
                      </span>
                    </div>
                  )}
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
                          audio.current?.stop();
                          audio.current?.setMusicActive(false);
                          setFeedback(null);
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
            <p className={styles.quiet}>
              {encounter.rulesVersion === 2
                ? 'Mistakes build one counterattack when your turn ends, capped after three mistakes. Clean turns avoid it. A defeated opponent cannot hit back.'
                : 'This encounter keeps its original battle rules. Your next encounter will use mistake-driven counterattacks.'}
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
                  <h2>Pokédex</h2>
                  <p>Browse all 151 Kanto entries. Unknown forms stay hidden until discovered.</p>
                </div>
                <span aria-label={`${guideEntryCount} of 151 entries discovered`}>
                  {guideEntryCount} / 151
                </span>
              </div>
              <div className={styles.guideFilters}>
                <label>
                  Search the Pokédex
                  <input
                    type="search"
                    value={guideSearch}
                    onChange={(event) => {
                      setGuideSearch(event.target.value);
                      setGuidePage(0);
                      setSelectedGuideSpecies(null);
                    }}
                    placeholder="Pokémon name"
                  />
                </label>
                <label className={styles.ownedFilter}>
                  <input
                    type="checkbox"
                    checked={guideOwned}
                    onChange={(event) => {
                      setGuideOwned(event.target.checked);
                      setGuidePage(0);
                      setSelectedGuideSpecies(null);
                    }}
                  />
                  Discovered only
                </label>
              </div>
              <p className={styles.quiet}>
                New families appear as your typing belt grows. Legendary Pokémon unlock at Black
                belt. Eevee and its three Kanto evolutions are separate wild catches.
              </p>
              <div className={styles.pokedex}>
                {guideEntries.length === 0 ? (
                  <p className={styles.guideNote} role="status">
                    No matching Pokémon. Try another name or turn off the discovered-only filter.
                  </p>
                ) : (
                  <>
                    <div className={styles.pokedexPageMeta} aria-live="polite">
                      <span>
                        Entries {String(currentGuidePage * POKEDEX_PAGE_SIZE + 1).padStart(3, '0')}–
                        {String(
                          Math.min((currentGuidePage + 1) * POKEDEX_PAGE_SIZE, guideEntries.length),
                        ).padStart(3, '0')}
                      </span>
                      <span>{guideEntries.length} results</span>
                    </div>
                    <div className={styles.pokedexContent}>
                      <ol className={styles.pokedexGrid} aria-label="Pokédex entries">
                        {visibleGuideEntries.map((entry) => {
                          const count = collection.caught[entry.family];
                          const stage =
                            count === undefined
                              ? -1
                              : POKEMON_LINES[entry.family].findIndex(
                                  (species) => species === pokemonForm(entry.family, count),
                                );
                          const discovered = entry.evolutionIndex <= stage;
                          const isCurrentPartner =
                            discovered && entry.family === partner && entry.species === form;
                          const selected = entry.species === selectedGuideEntry?.species;
                          return (
                            <li key={entry.species}>
                              <button
                                type="button"
                                className={`${styles.pokedexCard} ${isCurrentPartner ? styles.currentPokedexPartner : ''}`}
                                aria-label={`Pokédex entry #${String(entry.dexNumber).padStart(3, '0')}, ${discovered ? pokemonName(entry.species) : 'undiscovered Pokémon'}${isCurrentPartner ? ', current partner' : ''}`}
                                aria-pressed={selected}
                                onClick={() => setSelectedGuideSpecies(entry.species)}
                              >
                                <span className={styles.pokedexCardTop}>
                                  <span>#{String(entry.dexNumber).padStart(3, '0')}</span>
                                  <span>{discovered ? 'Seen' : '???'}</span>
                                </span>
                                <img
                                  className={`${styles.pokedexSprite} ${!discovered ? styles.unknownPokedexSprite : ''}`}
                                  src={`/pokemon-trails/icons/${entry.species}.png`}
                                  alt=""
                                  width={76}
                                  height={64}
                                  loading="lazy"
                                  aria-hidden="true"
                                />
                                <span className={styles.pokedexName}>
                                  {discovered ? pokemonName(entry.species) : '???'}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ol>
                      {selectedGuideEntry && (
                        <section className={styles.pokedexDetail} aria-live="polite">
                          <img
                            className={`${styles.pokedexDetailSprite} ${!selectedGuideDiscovered ? styles.unknownPokedexSprite : ''}`}
                            src={`/pokemon-trails/icons/${selectedGuideEntry.species}.png`}
                            alt=""
                            width={112}
                            height={96}
                            aria-hidden="true"
                          />
                          <div className={styles.pokedexDetailCopy}>
                            <span className={styles.pokedexDetailNumber}>
                              No. {String(selectedGuideEntry.dexNumber).padStart(3, '0')}
                            </span>
                            <h3>
                              {selectedGuideDiscovered
                                ? pokemonName(selectedGuideEntry.species)
                                : 'Undiscovered Pokémon'}
                            </h3>
                            {selectedGuideDiscovered ? (
                              <>
                                <p>
                                  {POKEMON_INFO[selectedGuideEntry.family].type} type ·{' '}
                                  {selectedGuideRemaining === null
                                    ? 'Fully evolved'
                                    : `${selectedGuideRemaining} more encounters to evolve`}
                                </p>
                                <ol className={styles.pokedexEvolution} aria-label="Evolution line">
                                  {POKEMON_LINES[selectedGuideEntry.family].map(
                                    (species, index) => (
                                      <li
                                        className={
                                          index <= selectedGuideStage ? styles.discoveredForm : ''
                                        }
                                        key={species}
                                      >
                                        {index <= selectedGuideStage ? pokemonName(species) : '???'}
                                      </li>
                                    ),
                                  )}
                                </ol>
                              </>
                            ) : (
                              <p>
                                {selectedGuideCount === undefined
                                  ? 'Find this Pokémon in the meadow to add it to your collection.'
                                  : `Keep training ${POKEMON_INFO[selectedGuideEntry.family].name} to reveal its next form.`}
                              </p>
                            )}
                            {selectedGuideDiscovered && (
                              <button
                                type="button"
                                className={styles.textButton}
                                disabled={
                                  busy ||
                                  !!collection.active ||
                                  selectedGuideEntry.family === partner
                                }
                                onClick={() => void selectPartner(selectedGuideEntry.family)}
                              >
                                {selectedGuideEntry.family === partner
                                  ? 'Your partner'
                                  : 'Make partner'}
                              </button>
                            )}
                            {!selectedGuideDiscovered &&
                              selectedGuideCount === undefined &&
                              STARTERS.includes(selectedGuideEntry.family) &&
                              !collection.guardian && (
                                <span className={styles.pokedexDetailNote}>
                                  Available after the guardian
                                </span>
                              )}
                          </div>
                        </section>
                      )}
                    </div>
                    <nav className={styles.pokedexPagination} aria-label="Pokédex pages">
                      <button
                        type="button"
                        className={styles.secondary}
                        disabled={currentGuidePage === 0}
                        onClick={() => {
                          setGuidePage(currentGuidePage - 1);
                          setSelectedGuideSpecies(null);
                        }}
                      >
                        Previous
                      </button>
                      <span>
                        Page {currentGuidePage + 1} of {guidePageCount}
                      </span>
                      <button
                        type="button"
                        className={styles.secondary}
                        disabled={currentGuidePage + 1 >= guidePageCount}
                        onClick={() => {
                          setGuidePage(currentGuidePage + 1);
                          setSelectedGuideSpecies(null);
                        }}
                      >
                        Next
                      </button>
                    </nav>
                  </>
                )}
              </div>
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
                The meadow is open to every belt; words always match yours. Earn the badge to
                encounter all three starter families.
              </p>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
