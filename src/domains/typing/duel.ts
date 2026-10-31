export type DuelPhase = 'ready' | 'playing' | 'won' | 'lost';
export type DuelEvent = 'strike' | 'special' | 'block' | 'hurt' | null;
export const RIVAL_HP = 120;

export interface DuelState {
  phase: DuelPhase;
  words: string[];
  wordIndex: number;
  typed: number;
  playerHp: number;
  rivalHp: number;
  combo: number;
  bestCombo: number;
  gems: number;
  cleared: number;
  cleanWord: boolean;
  remaining: number;
  elapsed: number;
}

export function currentDuelWord(state: DuelState): string {
  return state.words[state.wordIndex % state.words.length];
}

export function duelWordSeconds(word: string): number {
  return Math.max(10, 4 + word.length * 1.5);
}

export function createDuel(words: string[]): DuelState {
  if (!words.length || words.some((word) => !/^[a-z]{3,9}$/.test(word))) {
    throw new Error('A duel needs valid typing words.');
  }
  return {
    phase: 'ready',
    words: [...words],
    wordIndex: 0,
    typed: 0,
    playerHp: 100,
    rivalHp: RIVAL_HP,
    combo: 0,
    bestCombo: 0,
    gems: 0,
    cleared: 0,
    cleanWord: true,
    remaining: duelWordSeconds(words[0]),
    elapsed: 0,
  };
}

export function startDuel(state: DuelState): DuelState {
  return state.phase === 'ready' ? { ...state, phase: 'playing' } : state;
}

function nextWord(state: DuelState): DuelState {
  const next = { ...state, wordIndex: state.wordIndex + 1, typed: 0, cleanWord: true };
  return { ...next, remaining: duelWordSeconds(currentDuelWord(next)) };
}

export function typeDuelKey(state: DuelState, key: string): { state: DuelState; event: DuelEvent } {
  if (state.phase !== 'playing' || key.length !== 1) return { state, event: null };
  if (key !== currentDuelWord(state)[state.typed]) {
    return { state: { ...state, combo: 0, cleanWord: false }, event: 'block' };
  }
  const typed = state.typed + 1;
  if (typed < currentDuelWord(state).length) return { state: { ...state, typed }, event: null };
  const combo = state.cleanWord ? state.combo + 1 : 0;
  const special = state.cleanWord && state.gems === 3;
  const damage = special ? 24 : 8 + Math.min(combo, 4);
  const rivalHp = Math.max(0, state.rivalHp - damage);
  const hit: DuelState = {
    ...state,
    typed,
    rivalHp,
    combo,
    bestCombo: Math.max(state.bestCombo, combo),
    gems: special ? 0 : state.cleanWord ? Math.min(3, state.gems + 1) : state.gems,
    cleared: state.cleared + 1,
    phase: rivalHp === 0 ? 'won' : 'playing',
  };
  return { state: rivalHp === 0 ? hit : nextWord(hit), event: special ? 'special' : 'strike' };
}

/** Time only advances when the engine is focused and visible. */
export function tickDuel(
  state: DuelState,
  seconds: number,
): { state: DuelState; event: DuelEvent } {
  if (state.phase !== 'playing' || !Number.isFinite(seconds) || seconds <= 0)
    return { state, event: null };
  const remaining = state.remaining - seconds;
  const timed = { ...state, elapsed: state.elapsed + seconds, remaining };
  if (remaining > 0) return { state: timed, event: null };
  const playerHp = Math.max(0, state.playerHp - 20);
  const hit: DuelState = {
    ...timed,
    playerHp,
    combo: 0,
    phase: playerHp === 0 ? 'lost' : 'playing',
  };
  return { state: playerHp === 0 ? hit : nextWord(hit), event: 'hurt' };
}
