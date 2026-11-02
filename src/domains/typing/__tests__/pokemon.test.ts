import {
  applyTrailInput,
  applyTrailReward,
  createTrailBattle,
  isPokemonFamily,
  pokemonForm,
  replayTrail,
  trailFinished,
} from '../pokemon';
import type { PokemonCollection, PokemonEncounter, TrailInput } from '../pokemon';
import { fallbackQuestContent, QUEST_STAGES } from '../quest';

const encounter: PokemonEncounter = {
  id: 'test',
  opponent: 'caterpie',
  guardian: false,
  tutorial: false,
  words: fallbackQuestContent(QUEST_STAGES[0], {}).words,
  createdAt: new Date().toISOString(),
  belt: 0,
};
function play(
  options: {
    guardian?: boolean;
    tutorial?: boolean;
    mistakes?: boolean;
    badCapture?: boolean;
  } = {},
) {
  const config = { ...encounter, ...options };
  let state = createTrailBattle(config);
  const inputs: TrailInput[] = [];
  let at = 0;
  for (let turns = 0; turns < 30 && !trailFinished(state); turns++) {
    const prompt = state.prompt;
    if (options.mistakes || (options.badCapture && state.phase === 'capture')) {
      for (let i = 0; i < 6; i++) {
        const event: TrailInput = { kind: 'key', key: '!', at: (at += 150) };
        state = applyTrailInput(state, config, event);
        inputs.push(event);
      }
    }
    for (const key of prompt) {
      const event: TrailInput = { kind: 'key', key, at: (at += 150) };
      state = applyTrailInput(state, config, event);
      inputs.push(event);
    }
  }
  return { state, inputs, config, at };
}
it('catches a wild Pokémon with accurate typing and no countdown', () => {
  const { state, inputs, config, at } = play();
  expect(state.phase).toBe('caught');
  expect(state.playerHp).toBeGreaterThan(0);
  expect(replayTrail(config, inputs, at)).toEqual(state);
  expect(state.keystrokes.every((stroke) => stroke.correct)).toBe(true);
});
it('requires the space between the two attack words', () => {
  let state = createTrailBattle(encounter);
  const first = state.prompt.split(' ')[0];
  for (const key of first) state = applyTrailInput(state, encounter, { kind: 'key', key, at: 100 });
  expect(state.prompt[state.cursor]).toBe(' ');
  expect(state.turns).toBe(0);
});
it('keeps correct letters when a typo breaks the clean-turn bonus', () => {
  const initial = createTrailBattle(encounter);
  const typo = applyTrailInput(initial, encounter, { kind: 'key', key: '!', at: 100 });
  expect(typo.cursor).toBe(0);
  expect(typo.clean).toBe(false);
  expect(typo.keystrokes[0]).toMatchObject({ correct: false, expected: initial.prompt[0] });
});
it('offers one capture retry before returning the Pokémon to the meadow', () => {
  const { state } = play({ badCapture: true });
  expect(state.phase).toBe('escaped');
  expect(state.captureTries).toBe(2);
  expect(state.opponentHp).toBe(0);
});
it('lets beginners finish the tutorial without damage', () => {
  const { state } = play({ tutorial: true, mistakes: true });
  expect(state.playerHp).toBe(100);
});
it('rewards clean guardian battles but allows defeat after inaccurate turns', () => {
  expect(play({ guardian: true }).state).toMatchObject({ phase: 'escaped', opponentHp: 0 });
  expect(play({ guardian: true, mistakes: true }).state).toMatchObject({
    phase: 'lost',
    playerHp: 0,
  });
});
it('guards only before typing, consumes one charge, and records only typed words', () => {
  const initial = createTrailBattle(encounter);
  let state = applyTrailInput(initial, encounter, { kind: 'guard', at: 10 });
  expect(state.guards).toBe(1);
  expect(state.prompt).not.toContain(' ');
  expect(state.passage).toBe(state.prompt);
  expect(() => applyTrailInput(state, encounter, { kind: 'guard', at: 20 })).toThrow();
  const word = state.prompt;
  for (const key of word) state = applyTrailInput(state, encounter, { kind: 'key', key, at: 100 });
  expect(state.opponentHp).toBe(initial.opponentHp);
  expect(state.playerHp).toBe(97);
  expect(state.guarding).toBe(false);
  state = applyTrailInput(state, encounter, { kind: 'key', key: state.prompt[0], at: 200 });
  expect(() => applyTrailInput(state, encounter, { kind: 'guard', at: 300 })).toThrow();
});
it.each([
  null,
  [],
  [{ kind: 'key', key: 'x', at: NaN }],
  [{ kind: 'cheat', at: 100 }],
  [{ kind: 'key', key: '<script>', at: 100 }],
  Array(2501).fill({ kind: 'key', key: 'x', at: 100 }),
])('rejects malformed or unfinished replay inputs %#', (inputs) => {
  expect(() => replayTrail(encounter, inputs, 10000)).toThrow();
});
it('rejects out-of-order, future, and post-completion input events', () => {
  const { config, inputs, at } = play();
  expect(() =>
    replayTrail(config, [...inputs, { kind: 'key', key: 'x', at: at + 1 }], at + 10),
  ).toThrow();
  expect(() => replayTrail(config, [{ kind: 'key', key: 'x', at: -1 }], 10000)).toThrow();
  expect(() => replayTrail(config, inputs, 100)).toThrow();
  const reversed = inputs.map((event, i) => ({ ...event, at: i === 2 ? 0 : event.at }));
  expect(() => replayTrail(config, reversed, at)).toThrow();
});
it('does not trust supplied correct flags or battle results', () => {
  const { inputs, config, state, at } = play();
  const forged = inputs.map((event) => ({ ...event, correct: false, damage: 999, caught: true }));
  expect(replayTrail(config, forged, at)).toEqual(state);
});
it('safely checks family names and evolves only at training milestones', () => {
  expect(isPokemonFamily('__proto__')).toBe(false);
  expect(isPokemonFamily('constructor')).toBe(false);
  expect(pokemonForm('bulbasaur', 3)).toBe('bulbasaur');
  expect(pokemonForm('bulbasaur', 4)).toBe('ivysaur');
  expect(pokemonForm('bulbasaur', 9)).toBe('venusaur');
});
it('adds a catch without resetting an existing Pokémon’s training', () => {
  const collection: PokemonCollection = {
    version: 2,
    partner: 'bulbasaur',
    caught: { bulbasaur: 3, caterpie: 5 },
    wins: 2,
    guardian: false,
    rewardDay: '',
    rewardsToday: 0,
    active: encounter,
  };
  const result = applyTrailReward(collection, encounter, play().state);
  expect(result).toMatchObject({
    version: 3,
    caught: { bulbasaur: 4, caterpie: 5 },
    wins: 3,
    active: undefined,
  });
  expect(collection.caught.bulbasaur).toBe(3);
});
it('does not award a captured guardian, and a loss preserves the collection', () => {
  const collection: PokemonCollection = {
    version: 2,
    partner: 'bulbasaur',
    caught: { bulbasaur: 0 },
    wins: 3,
    guardian: false,
    rewardDay: '',
    rewardsToday: 0,
  };
  const won = play({ guardian: true });
  expect(applyTrailReward(collection, won.config, won.state)).toMatchObject({
    guardian: true,
    wins: 4,
    caught: { bulbasaur: 1 },
  });
  const lost = play({ guardian: true, mistakes: true });
  expect(applyTrailReward(collection, lost.config, lost.state).caught).toEqual({ bulbasaur: 1 });
});
it('rejects an empty or unsafe word pool', () => {
  expect(() => createTrailBattle({ ...encounter, words: [] })).toThrow();
  expect(() => createTrailBattle({ ...encounter, words: Array(20).fill('<script>') })).toThrow();
});
