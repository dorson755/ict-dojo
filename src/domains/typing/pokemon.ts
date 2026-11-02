import type { KeystrokeEvent } from './types';

export const POKEMON_LINES = {
  bulbasaur: ['bulbasaur', 'ivysaur', 'venusaur'],
  charmander: ['charmander', 'charmeleon', 'charizard'],
  squirtle: ['squirtle', 'wartortle', 'blastoise'],
  caterpie: ['caterpie', 'metapod', 'butterfree'],
  pidgey: ['pidgey', 'pidgeotto', 'pidgeot'],
} as const;
export type PokemonFamily = keyof typeof POKEMON_LINES;
export type PokemonSpecies = (typeof POKEMON_LINES)[PokemonFamily][number];
export const STARTERS: PokemonFamily[] = ['bulbasaur', 'charmander', 'squirtle'];
export const POKEMON_INFO: Record<
  PokemonFamily,
  { name: string; type: string; move: string; description: string }
> = {
  bulbasaur: {
    name: 'Bulbasaur',
    type: 'Grass',
    move: 'Vine Whip',
    description: 'Patient and steady. A little courage, a little sunshine.',
  },
  charmander: {
    name: 'Charmander',
    type: 'Fire',
    move: 'Ember',
    description: 'Bright and curious. Ready for the next trail.',
  },
  squirtle: {
    name: 'Squirtle',
    type: 'Water',
    move: 'Water Gun',
    description: 'Calm and determined. Small steps, strong rhythm.',
  },
  caterpie: {
    name: 'Caterpie',
    type: 'Bug',
    move: 'Tackle',
    description: 'A small discovery with a big transformation ahead.',
  },
  pidgey: {
    name: 'Pidgey',
    type: 'Flying',
    move: 'Gust',
    description: 'An eager companion from the meadow canopy.',
  },
};
export function pokemonName(species: string): string {
  return species.charAt(0).toUpperCase() + species.slice(1);
}
export function pokemonForm(family: PokemonFamily, training: number): PokemonSpecies {
  return POKEMON_LINES[family][training >= 9 ? 2 : training >= 4 ? 1 : 0];
}
export function isPokemonFamily(value: unknown): value is PokemonFamily {
  return typeof value === 'string' && Object.hasOwn(POKEMON_LINES, value);
}
export interface PokemonCollection {
  version: number;
  partner: PokemonFamily;
  caught: Partial<Record<PokemonFamily, number>>;
  wins: number;
  guardian: boolean;
  rewardDay: string;
  rewardsToday: number;
  active?: PokemonEncounter;
  lastEncounter?: Pick<PokemonEncounter, 'id' | 'createdAt'>;
}
export interface PokemonEncounter {
  id: string;
  opponent: PokemonFamily;
  guardian: boolean;
  tutorial: boolean;
  words: string[];
  createdAt: string;
  belt: number;
}
export type TrailInput = { kind: 'key'; key: string; at: number } | { kind: 'guard'; at: number };
export type TrailPhase = 'battle' | 'capture' | 'caught' | 'escaped' | 'lost';
export interface TrailBattle {
  phase: TrailPhase;
  playerHp: number;
  opponentHp: number;
  maxOpponentHp: number;
  guards: number;
  guarding: boolean;
  combo: number;
  turns: number;
  captureTries: number;
  message: string;
  prompt: string;
  cursor: number;
  clean: boolean;
  promptAttempts: number;
  wordOffset: number;
  passage: string;
  keystrokes: KeystrokeEvent[];
}
export function trailFinished(state: TrailBattle): boolean {
  return ['caught', 'escaped', 'lost'].includes(state.phase);
}
function nextPrompt(state: TrailBattle, encounter: PokemonEncounter, count: number): TrailBattle {
  const prompt = Array.from(
    { length: count },
    (_, i) => encounter.words[(state.wordOffset + i) % encounter.words.length],
  ).join(' ');
  return {
    ...state,
    prompt,
    cursor: 0,
    clean: true,
    promptAttempts: 0,
    wordOffset: state.wordOffset + count,
    passage: state.passage ? `${state.passage}\n${prompt}` : prompt,
  };
}
export function createTrailBattle(encounter: PokemonEncounter): TrailBattle {
  if (encounter.words.length < 16 || encounter.words.some((word) => !/^[a-z]{3,9}$/.test(word)))
    throw new Error('This encounter needs valid typing words.');
  const hp = encounter.guardian ? 160 : encounter.tutorial ? 60 : 100;
  return nextPrompt(
    {
      phase: 'battle',
      playerHp: 100,
      opponentHp: hp,
      maxOpponentHp: hp,
      guards: 2,
      guarding: false,
      combo: 0,
      turns: 0,
      captureTries: 0,
      message: 'Type both words, including the space, to use your move.',
      prompt: '',
      cursor: 0,
      clean: true,
      promptAttempts: 0,
      wordOffset: 0,
      passage: '',
      keystrokes: [],
    },
    encounter,
    2,
  );
}
export function applyTrailInput(
  state: TrailBattle,
  encounter: PokemonEncounter,
  input: TrailInput,
): TrailBattle {
  if (trailFinished(state)) throw new Error('This encounter is already complete.');
  if (input.kind === 'guard') {
    if (
      state.phase !== 'battle' ||
      state.cursor ||
      state.promptAttempts ||
      state.guarding ||
      !state.guards
    )
      throw new Error('Guard is only available before typing a turn.');
    // Replace the untouched attack prompt; do not log words that were never typed.
    const prefix = state.passage.slice(0, -state.prompt.length);
    const prompt = state.prompt.split(' ')[0];
    return {
      ...state,
      guarding: true,
      guards: state.guards - 1,
      prompt,
      passage: prefix + prompt,
      message: 'Type this word to guard and recover a little health.',
    };
  }
  const expected = state.prompt[state.cursor];
  const correct = input.key === expected;
  const typed: TrailBattle = {
    ...state,
    cursor: state.cursor + (correct ? 1 : 0),
    clean: state.clean && correct,
    promptAttempts: state.promptAttempts + 1,
    keystrokes: [
      ...state.keystrokes,
      {
        actual: input.key,
        expected,
        correct,
        position: state.passage.length - state.prompt.length + state.cursor,
        timestamp_ms: input.at,
      },
    ],
  };
  if (!correct)
    return {
      ...typed,
      message: 'Keep going. The highlighted letter is next; there is no time limit.',
    };
  if (typed.cursor < typed.prompt.length) return typed;
  if (state.phase === 'capture') {
    const accuracy = typed.prompt.length / typed.promptAttempts;
    if (accuracy >= 0.9)
      return {
        ...typed,
        phase: 'caught',
        message: 'A new friendship! Capture challenge complete.',
      };
    if (typed.captureTries >= 2)
      return {
        ...typed,
        phase: 'escaped',
        message: 'The Pokémon returned to the meadow. Your practice still counts.',
      };
    return nextPrompt(
      {
        ...typed,
        captureTries: typed.captureTries + 1,
        message: 'One more chance. Aim for at least 90% accuracy in these three words.',
      },
      encounter,
      3,
    );
  }
  const combo = typed.clean && !typed.guarding ? state.combo + 1 : 0;
  const damage = typed.guarding
    ? 0
    : 20 + (typed.clean ? 8 : 0) + (combo > 0 && combo % 3 === 0 ? 12 : 0);
  const opponentHp = Math.max(0, typed.opponentHp - damage);
  const turn = { ...typed, opponentHp, combo, turns: typed.turns + 1 };
  if (!opponentHp) {
    if (encounter.guardian)
      return {
        ...turn,
        phase: 'escaped',
        message: 'Meadow guardian defeated! The trail is yours to explore.',
      };
    return nextPrompt(
      {
        ...turn,
        phase: 'capture',
        captureTries: 1,
        message: 'Ready to befriend? Type these three words with at least 90% accuracy.',
      },
      encounter,
      3,
    );
  }
  const response = encounter.tutorial ? 0 : encounter.guardian ? 18 : 12;
  const playerHp = Math.max(
    0,
    Math.min(100, turn.playerHp + (typed.guarding ? 10 : 0)) -
      (typed.guarding ? Math.ceil(response / 4) : response),
  );
  const resolved = {
    ...turn,
    playerHp,
    guarding: false,
    message: typed.guarding
      ? 'Guard held. Take a breath, then attack.'
      : damage > 28
        ? 'Focus move! Your clean typing gave that attack extra power.'
        : typed.clean
          ? 'Clean hit! Accuracy powered up your move.'
          : 'Your move landed. A clean turn will make it stronger.',
  };
  return playerHp
    ? nextPrompt(resolved, encounter, 2)
    : {
        ...resolved,
        phase: 'lost',
        message: 'Time to rest at camp. Your partner and collection are safe.',
      };
}
/** Replays only raw inputs, never trusting client-supplied damage, accuracy, or catches. */
export function replayTrail(
  encounter: PokemonEncounter,
  raw: unknown,
  wallMs: number,
): TrailBattle {
  if (!Array.isArray(raw) || !raw.length || raw.length > 2500)
    throw new Error('Invalid encounter inputs.');
  let state = createTrailBattle(encounter);
  let previous = 0;
  for (const value of raw) {
    if (!value || typeof value !== 'object') throw new Error('Invalid input.');
    const event = value as TrailInput;
    if (
      !Number.isFinite(event.at) ||
      event.at < previous ||
      event.at < 0 ||
      event.at > wallMs + 1000 ||
      event.at >= 1800_000
    )
      throw new Error('Invalid encounter timing.');
    if (
      event.kind !== 'guard' &&
      (event.kind !== 'key' || typeof event.key !== 'string' || !/^[\x20-\x7e]$/.test(event.key))
    )
      throw new Error('Invalid typing input.');
    state = applyTrailInput(state, encounter, event);
    previous = event.at;
  }
  if (!trailFinished(state) || previous < 1000)
    throw new Error('Finish this encounter before saving.');
  return state;
}
export function applyTrailReward(
  collection: PokemonCollection,
  encounter: PokemonEncounter,
  battle: TrailBattle,
): PokemonCollection {
  const caught = { ...collection.caught };
  caught[collection.partner] = Math.min(99, (caught[collection.partner] ?? 0) + 1);
  if (battle.phase === 'caught' && caught[encounter.opponent] === undefined)
    caught[encounter.opponent] = 0;
  return {
    ...collection,
    caught,
    version: collection.version + 1,
    wins: collection.wins + (battle.opponentHp === 0 ? 1 : 0),
    guardian: collection.guardian || (encounter.guardian && battle.opponentHp === 0),
    active: undefined,
    lastEncounter: { id: encounter.id, createdAt: encounter.createdAt },
  };
}
