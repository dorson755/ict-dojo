import {
  createDefense,
  defenseTarget,
  defenseSeconds,
  startDefenseWave,
  tickDefense,
  typeDefenseKey,
} from '../defense';
import type { DefenseState } from '../defense';
import { TypingEvaluator } from '../evaluator';
import type { KeystrokeEvent } from '../types';

const words = [
  'cat',
  'key',
  'row',
  'the',
  'and',
  'sun',
  'map',
  'run',
  'hat',
  'red',
  'cup',
  'dog',
  'pen',
  'sit',
  'top',
  'box',
  'fox',
  'day',
];
function finishWord(state: DefenseState) {
  const target = defenseTarget(state)!;
  const word = state.words[target.wordIndices[0]];
  let result = { state, event: null as ReturnType<typeof typeDefenseKey>['event'] };
  for (const key of word.slice(target.typed)) result = typeDefenseKey(result.state, key);
  return result;
}

it('rejects too little or malformed content and clones its input', () => {
  expect(() => createDefense([])).toThrow();
  expect(() => createDefense(words.slice(1))).toThrow();
  expect(() => createDefense([...words.slice(1), '<img>'])).toThrow();
  const state = createDefense(words);
  expect(state.words).not.toBe(words);
  expect(typeDefenseKey(state, 'c').state).toBe(state);
  expect(tickDefense(state, 3).state).toBe(state);
  expect(defenseSeconds('precision')).toBeGreaterThan(defenseSeconds('cat'));
});

it('spawns three staggered types and starts only once', () => {
  const state = startDefenseWave(createDefense(words));
  expect(state.phase).toBe('playing');
  expect(startDefenseWave(state)).toBe(state);
  expect(state.enemies.map((e) => e.kind)).toEqual(['scout', 'runner', 'guard']);
  expect(state.enemies.map((e) => e.remaining)).toEqual([14, 20, 26]);
  expect(state.enemies.flatMap((e) => e.wordIndices)).toEqual([0, 1, 2]);
});

it('advances only on the exact next letter and never hurts the gate on a typo', () => {
  let state = startDefenseWave(createDefense(words));
  state = typeDefenseKey(state, 'c').state;
  const result = typeDefenseKey(state, 'X');
  expect(result.event).toBe('typo');
  expect(defenseTarget(result.state)?.typed).toBe(1);
  expect(result.state.health).toBe(100);
  expect(finishWord(result.state).state.streak).toBe(0);
  expect(typeDefenseKey(state, 'Shift').state).toBe(state);
});

it('awards a shield every three clean words, capped at two', () => {
  let state = startDefenseWave(createDefense(words));
  for (let wave = 0; wave < 3; wave++) {
    state = finishWord(state).state;
    state = finishWord(state).state;
    const team = finishWord(state);
    expect(team.event).toBe('team');
    state = team.state;
    expect(state.shields).toBe(Math.min(2, wave + 1));
    expect(state.phase).toBe('between');
    if (wave < 2) state = startDefenseWave(state);
  }
  expect(state.bestStreak).toBe(9);
});

it('team attacks push remaining enemies back without clearing untyped words', () => {
  let state = startDefenseWave(createDefense(words));
  state = { ...state, streak: 2 };
  state = tickDefense(state, 5).state;
  const next = state.enemies[1].remaining;
  const result = finishWord(state);
  expect(result.event).toBe('team');
  expect(result.state.enemies).toHaveLength(2);
  expect(result.state.enemies[0].remaining).toBe(next + 4);
  expect(result.state.cleared).toBe(1);
});

it('blocks one breach per shield and resets partial input when a target gets past', () => {
  let state = startDefenseWave(createDefense(words));
  state = { ...typeDefenseKey(state, 'c').state, shields: 1, streak: 2 };
  const hit = tickDefense(state, 14);
  expect(hit.event).toBe('shield');
  expect(hit.state.health).toBe(100);
  expect(hit.state.shields).toBe(0);
  expect(hit.state.streak).toBe(0);
  expect(defenseTarget(hit.state)?.typed).toBe(0);
  expect(defenseTarget(hit.state)?.wordIndices).toEqual([1]);
  expect(tickDefense(hit.state, 6).state.health).toBe(80);
});

it('does not advance time between waves, or on invalid ticks', () => {
  let state = startDefenseWave(createDefense(words));
  for (const seconds of [0, -1, NaN, Infinity])
    expect(tickDefense(state, seconds).state).toBe(state);
  for (let i = 0; i < 3; i++) state = finishWord(state).state;
  expect(state.phase).toBe('between');
  expect(tickDefense(state, 100).state).toBe(state);
});

it('resolves simultaneous breaches without negative health and cannot restart a loss', () => {
  let state = startDefenseWave(createDefense(words));
  state = tickDefense(state, 100).state;
  expect(state.health).toBe(40);
  expect(state.phase).toBe('between');
  state = tickDefense(startDefenseWave(state), 100).state;
  expect(state.health).toBe(0);
  expect(state.phase).toBe('lost');
  expect(startDefenseWave(state)).toBe(state);
  expect(typeDefenseKey(state, 'x').state).toBe(state);
});

it('requires three typed boss words, even when a shield or health absorbs the deadline', () => {
  let state = startDefenseWave(createDefense(words));
  for (let wave = 0; wave < 5; wave++) {
    for (let i = 0; i < 3; i++) state = finishWord(state).state;
    state = startDefenseWave(state);
  }
  expect(state.wave).toBe(6);
  expect(defenseTarget(state)?.kind).toBe('boss');
  expect(defenseTarget(state)?.wordIndices).toEqual([15, 16, 17]);
  state = tickDefense(state, 30).state;
  expect(state.phase).toBe('playing');
  expect(state.cleared).toBe(15);
  for (let i = 0; i < 3; i++) state = finishWord(state).state;
  expect(state.phase).toBe('won');
  expect(state.cleared).toBe(18);
  expect(tickDefense(state, 100).state).toBe(state);
  expect(typeDefenseKey(state, 'x').state).toBe(state);
});

it('virtual passage positions produce honest common-word evaluator results', () => {
  const passage = words.join('');
  const strokes: KeystrokeEvent[] = [];
  let state = startDefenseWave(createDefense(words));
  let timestamp = 0;
  for (let i = 0; i < 18; i++) {
    if (state.phase === 'between') state = startDefenseWave(state);
    const target = defenseTarget(state)!;
    const index = target.wordIndices[0];
    const offset = words.slice(0, index).join('').length;
    for (const key of words[index]) {
      const position = offset + defenseTarget(state)!.typed;
      strokes.push({
        position,
        expected: key,
        actual: key,
        correct: true,
        timestamp_ms: (timestamp += 200),
      });
      state = typeDefenseKey(state, key).state;
    }
  }
  const result = new TypingEvaluator().evaluate({
    studentId: 'qa',
    exerciseId: 'game-dojo-defense',
    passage,
    keystrokes: strokes,
    startedAt: 0,
    completedAt: timestamp,
    skillIds: ['typing-common-words'],
    mode: 'accuracy',
  });
  expect(result.isValid).toBe(true);
  expect(result.accuracy).toBe(100);
  expect(state.phase).toBe('won');
});
