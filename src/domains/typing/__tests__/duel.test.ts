import {
  createDuel,
  currentDuelWord,
  duelWordSeconds,
  startDuel,
  tickDuel,
  typeDuelKey,
} from '../duel';
import type { DuelState } from '../duel';

function word(state: DuelState) {
  let event;
  for (const key of currentDuelWord(state)) {
    const result = typeDuelKey(state, key);
    state = result.state;
    event = result.event;
  }
  return { state, event };
}

it('starts only once and rejects empty or malformed content', () => {
  expect(() => createDuel([])).toThrow();
  expect(() => createDuel(['<script>'])).toThrow();
  const state = createDuel(['the']);
  expect(typeDuelKey(state, 't').state).toBe(state);
  expect(tickDuel(state, 1).state).toBe(state);
  const started = startDuel(state);
  expect(startDuel(started)).toBe(started);
  expect(duelWordSeconds('precision')).toBeGreaterThan(duelWordSeconds('the'));
});

it('earns a gem per clean word and uses three gems on the next clean strike', () => {
  let state = startDuel(createDuel(['the', 'and', 'key', 'row']));
  for (let i = 0; i < 3; i++) state = word(state).state;
  expect(state.combo).toBe(3);
  expect(state.gems).toBe(3);
  const hp = state.rivalHp;
  const special = word(state);
  expect(special.event).toBe('special');
  expect(special.state.gems).toBe(0);
  expect(special.state.rivalHp).toBe(hp - 24);
});

it('does not advance on a typo or grant a clean-word combo', () => {
  let state = word(startDuel(createDuel(['the', 'key']))).state;
  const result = typeDuelKey(state, 'x');
  state = result.state;
  expect(result.event).toBe('block');
  expect(state.typed).toBe(0);
  expect(state.combo).toBe(0);
  expect(state.playerHp).toBe(100);
  expect(word(state).state.gems).toBe(1);
});

it('a missed deadline costs health and resets the word, not the whole match', () => {
  let state = startDuel(createDuel(['the', 'key']));
  state = typeDuelKey(state, 't').state;
  const result = tickDuel(state, 10);
  expect(result.event).toBe('hurt');
  expect(result.state.playerHp).toBe(80);
  expect(result.state.wordIndex).toBe(1);
  expect(result.state.typed).toBe(0);
  expect(result.state.remaining).toBe(duelWordSeconds('key'));
});

it('finishes deterministically and ignores keys and ticks after a win or loss', () => {
  let win = startDuel(createDuel(['the']));
  for (let i = 0; i < 20 && win.phase === 'playing'; i++) win = word(win).state;
  expect(win.phase).toBe('won');
  expect(typeDuelKey(win, 'x').state).toBe(win);
  expect(tickDuel(win, 1).state).toBe(win);
  let loss = startDuel(createDuel(['the']));
  for (let i = 0; i < 5; i++) loss = tickDuel(loss, 10).state;
  expect(loss.phase).toBe('lost');
  expect(loss.playerHp).toBe(0);
  expect(typeDuelKey(loss, 't').state).toBe(loss);
  expect(tickDuel(loss, 1).state).toBe(loss);
});
