import { applyTrailInput, createTrailBattle } from '@/domains/typing/pokemon';
import type { PokemonEncounter } from '@/domains/typing/pokemon';
import { fallbackQuestContent, QUEST_STAGES } from '@/domains/typing/quest';
import { trailElement, trailFeedback } from '../trail-feedback';

const encounter: PokemonEncounter = {
  id: 'feedback',
  opponent: 'pikachu',
  guardian: false,
  tutorial: false,
  words: fallbackQuestContent(QUEST_STAGES[0], {}).words,
  belt: 0,
  createdAt: '',
  rulesVersion: 2,
};
it.each([
  ['Grass', 'leaf'],
  ['Bug', 'leaf'],
  ['Fire', 'ember'],
  ['Water', 'bubble'],
  ['Ice', 'bubble'],
  ['Electric', 'spark'],
  ['Normal', 'spark'],
])('uses a reusable elemental effect for %s', (type, element) =>
  expect(trailElement(type)).toBe(element),
);
it('distinguishes quiet letters, word confirmations, and typos', () => {
  let previous = createTrailBattle(encounter);
  let next = applyTrailInput(previous, encounter, { kind: 'key', key: '!', at: 100 });
  expect(trailFeedback(previous, next, encounter)?.cue).toBe('mistake');
  previous = { ...previous, cursor: previous.prompt.indexOf(' ') };
  next = applyTrailInput(previous, encounter, { kind: 'key', key: ' ', at: 100 });
  expect(trailFeedback(previous, next, encounter)?.cue).toBe('word');
  next = applyTrailInput(previous, encounter, {
    kind: 'key',
    key: previous.prompt[previous.cursor],
    at: 100,
  });
  expect(trailFeedback(next, next, encounter)).toBeNull();
});
it('computes visual counterattack damage from the completed turn, not net HP after healing', () => {
  const previous = {
    ...createTrailBattle(encounter),
    prompt: 'cat',
    cursor: 2,
    promptAttempts: 3,
    clean: false,
    guarding: true,
    playerHp: 60,
  };
  const next = applyTrailInput(previous, encounter, { kind: 'key', key: 't', at: 300 });
  expect(next.playerHp).toBe(68);
  expect(trailFeedback(previous, next, encounter)).toEqual({ cue: 'guard', damage: 0, counter: 2 });
});
it('gives a single attack reaction on the finishing hit, without a phantom counterattack', () => {
  const previous = {
    ...createTrailBattle(encounter),
    prompt: 'cat',
    cursor: 2,
    promptAttempts: 5,
    clean: false,
    opponentHp: 20,
  };
  const next = applyTrailInput(previous, encounter, { kind: 'key', key: 't', at: 300 });
  expect(next.phase).toBe('capture');
  expect(trailFeedback(previous, next, encounter)).toEqual({
    cue: 'attack',
    damage: 20,
    counter: 0,
  });
});
it('separates capture success, retries, and escape from battle movement', () => {
  const previous = {
    ...createTrailBattle(encounter),
    phase: 'capture' as const,
    prompt: 'cat',
    cursor: 2,
    promptAttempts: 2,
    captureTries: 1,
  };
  const input = { kind: 'key' as const, key: 't', at: 300 };
  expect(trailFeedback(previous, applyTrailInput(previous, encounter, input), encounter)?.cue).toBe(
    'capture',
  );
  const inaccurate = { ...previous, promptAttempts: 5 };
  expect(
    trailFeedback(inaccurate, applyTrailInput(inaccurate, encounter, input), encounter)?.cue,
  ).toBe('retry');
  const lastChance = { ...inaccurate, captureTries: 2 };
  expect(
    trailFeedback(lastChance, applyTrailInput(lastChance, encounter, input), encounter)?.cue,
  ).toBe('escape');
});
