import {
  applyTrailInput,
  createTrailBattle,
  replayTrail,
  trailCounterDamage,
  trailFinished,
} from '../pokemon';
import type { PokemonEncounter, TrailBattle, TrailInput } from '../pokemon';
import { fallbackQuestContent, QUEST_STAGES } from '../quest';

const encounter: PokemonEncounter = {
  id: 'counter',
  opponent: 'pikachu',
  guardian: false,
  tutorial: false,
  words: fallbackQuestContent(QUEST_STAGES[0], {}).words,
  belt: 0,
  createdAt: new Date().toISOString(),
  rulesVersion: 2,
};
function completeTurn(state: TrailBattle, config = encounter, mistakes = 0) {
  for (let i = 0; i < mistakes; i++)
    state = applyTrailInput(state, config, { kind: 'key', key: '!', at: 100 });
  const remaining = state.prompt.slice(state.cursor);
  for (const key of remaining)
    state = applyTrailInput(state, config, { kind: 'key', key, at: 200 });
  return state;
}
it.each([
  [0, 0],
  [1, 6],
  [2, 12],
  [3, 18],
  [100, 18],
])(
  'resolves %i mistakes into one capped %i HP response at the end of a turn',
  (mistakes, response) => {
    const initial = createTrailBattle(encounter);
    const result = completeTurn(initial, encounter, mistakes);
    expect(result.playerHp).toBe(100 - response);
    expect(result.turns).toBe(1);
    expect(result.promptAttempts).toBe(0);
    expect(result.cursor).toBe(0);
  },
);
it('does not damage the player or erase correct letters while mistakes are being made', () => {
  let state = createTrailBattle(encounter);
  state = applyTrailInput(state, encounter, { kind: 'key', key: state.prompt[0], at: 10 });
  for (let i = 0; i < 20; i++)
    state = applyTrailInput(state, encounter, { kind: 'key', key: '!', at: 20 });
  expect(state.playerHp).toBe(100);
  expect(state.cursor).toBe(1);
  expect(state.promptAttempts - state.cursor).toBe(20);
  expect(completeTurn(state).playerHp).toBe(82);
});
it('discharges the meter after each turn, so a subsequent clean turn avoids a response', () => {
  const hurt = completeTurn(createTrailBattle(encounter), encounter, 3);
  const clean = completeTurn(hurt);
  expect(clean.playerHp).toBe(82);
  expect(clean.message).toContain('No mistakes, no counterattack');
});
it('heals while guarding and reduces a queued counterattack to a quarter, rounded up', () => {
  const hurt = completeTurn(createTrailBattle(encounter), encounter, 3);
  const guard = applyTrailInput(hurt, encounter, { kind: 'guard', at: 300 });
  const result = completeTurn(guard, encounter, 1);
  expect(result.playerHp).toBe(90); // 82 + 10 recovery - ceil(6 / 4).
  expect(result.opponentHp).toBe(hurt.opponentHp);
  expect(result.guards).toBe(1);
  expect(result.guarding).toBe(false);
  expect(trailCounterDamage({ ...encounter, guardian: true }, 3, true)).toBe(7);
});
it('never counterattacks in the tutorial, after defeat, or during capture attempts', () => {
  expect(
    completeTurn(createTrailBattle(encounter), { ...encounter, tutorial: true }, 30).playerHp,
  ).toBe(100);
  const almost = { ...createTrailBattle(encounter), opponentHp: 20, playerHp: 40 };
  const capture = completeTurn(almost, encounter, 10);
  expect(capture.phase).toBe('capture');
  expect(capture.playerHp).toBe(40);
  const retry = completeTurn(capture, encounter, 10);
  expect(retry.captureTries).toBe(2);
  expect(retry.playerHp).toBe(40);
});
it('keeps legacy encounters unchanged and ignores client-supplied rule changes', () => {
  const legacy = { ...encounter, rulesVersion: undefined };
  expect(completeTurn(createTrailBattle(legacy), legacy).playerHp).toBe(88);
  expect(completeTurn(createTrailBattle(legacy), { ...legacy, guardian: true }).playerHp).toBe(82);
  const guard = applyTrailInput(createTrailBattle(legacy), legacy, { kind: 'guard', at: 100 });
  expect(completeTurn(guard, legacy).playerHp).toBe(97);
});
it.each([false, true])(
  'replays the new rules identically for a complete guardian=%s encounter',
  (guardian) => {
    const config = { ...encounter, guardian };
    let state = createTrailBattle(config);
    const inputs: TrailInput[] = [];
    let at = 0;
    while (!trailFinished(state)) {
      const keys = (guardian ? '!!!' : '') + state.prompt;
      for (const key of keys) {
        const input: TrailInput = { kind: 'key', key, at: (at += 150) };
        inputs.push(input);
        state = applyTrailInput(state, config, input);
      }
    }
    expect(state.phase).toBe(guardian ? 'lost' : 'caught');
    const forged = inputs.map((input) => ({ ...input, rulesVersion: 1, counterDamage: 0 }));
    expect(replayTrail(config, forged, at)).toEqual(state);
  },
);
