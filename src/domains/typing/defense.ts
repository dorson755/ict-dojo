export type DefensePhase = 'ready' | 'playing' | 'between' | 'won' | 'lost';
export type DefenseEvent = 'strike' | 'team' | 'typo' | 'hurt' | 'shield' | null;
export type EnemyKind = 'scout' | 'runner' | 'guard' | 'boss';
export const DEFENSE_WORD_COUNT = 18;
export const DEFENSE_WAVES = 5;

export interface DefenseEnemy {
  id: number;
  kind: EnemyKind;
  wordIndices: number[];
  typed: number;
  clean: boolean;
  remaining: number;
  travelSeconds: number;
}
export interface DefenseState {
  phase: DefensePhase;
  words: string[];
  wave: number;
  enemies: DefenseEnemy[];
  health: number;
  shields: number;
  streak: number;
  bestStreak: number;
  cleared: number;
  elapsed: number;
}

export function defenseSeconds(word: string): number {
  return Math.max(14, 7 + word.length * 1.6);
}

function waveEnemies(words: string[], wave: number): DefenseEnemy[] {
  const boss = wave > DEFENSE_WAVES;
  const indices = boss ? [15] : [0, 1, 2].map((i) => (wave - 1) * 3 + i);
  const kinds: EnemyKind[] = ['scout', 'runner', 'guard'];
  return indices.map((index, i) => {
    const travelSeconds = defenseSeconds(words[index]) + i * 6 + (boss ? 7 : 0);
    return {
      id: index,
      kind: boss ? 'boss' : kinds[(wave + i - 1) % kinds.length],
      wordIndices: boss ? [15, 16, 17] : [index],
      typed: 0,
      clean: true,
      remaining: travelSeconds,
      travelSeconds,
    };
  });
}

export function createDefense(words: string[]): DefenseState {
  if (words.length < DEFENSE_WORD_COUNT || words.some((word) => !/^[a-z]{3,9}$/.test(word))) {
    throw new Error('Defense needs eighteen valid typing words.');
  }
  return {
    phase: 'ready',
    words: [...words.slice(0, DEFENSE_WORD_COUNT)],
    wave: 1,
    enemies: [],
    health: 100,
    shields: 0,
    streak: 0,
    bestStreak: 0,
    cleared: 0,
    elapsed: 0,
  };
}

export function startDefenseWave(state: DefenseState): DefenseState {
  if (state.phase !== 'ready' && state.phase !== 'between') return state;
  const wave = state.phase === 'ready' ? 1 : state.wave + 1;
  return { ...state, wave, phase: 'playing', enemies: waveEnemies(state.words, wave) };
}

export function defenseTarget(state: DefenseState): DefenseEnemy | undefined {
  // Target stays stable while typing, even after a team knockback.
  return state.enemies[0];
}

function finishWave(state: DefenseState): DefenseState {
  if (state.health === 0) return { ...state, phase: 'lost' };
  if (state.enemies.length) return state;
  return { ...state, phase: state.wave > DEFENSE_WAVES ? 'won' : 'between' };
}

export function typeDefenseKey(
  state: DefenseState,
  key: string,
): { state: DefenseState; event: DefenseEvent } {
  const target = defenseTarget(state);
  if (state.phase !== 'playing' || !target || key.length !== 1) return { state, event: null };
  const word = state.words[target.wordIndices[0]];
  if (key !== word[target.typed]) {
    return {
      state: {
        ...state,
        streak: 0,
        enemies: [{ ...target, clean: false }, ...state.enemies.slice(1)],
      },
      event: 'typo',
    };
  }
  if (target.typed + 1 < word.length) {
    return {
      state: {
        ...state,
        enemies: [{ ...target, typed: target.typed + 1 }, ...state.enemies.slice(1)],
      },
      event: null,
    };
  }
  const streak = target.clean ? state.streak + 1 : 0;
  const team = streak > 0 && streak % 3 === 0;
  const indices = target.wordIndices.slice(1);
  let enemies = state.enemies.slice(1);
  if (indices.length) {
    const travelSeconds = defenseSeconds(state.words[indices[0]]) + 7;
    enemies = [
      {
        ...target,
        wordIndices: indices,
        typed: 0,
        clean: true,
        travelSeconds,
        remaining: travelSeconds,
      },
      ...enemies,
    ];
  }
  if (team) {
    enemies = enemies.map((enemy) => ({
      ...enemy,
      remaining: Math.min(enemy.travelSeconds, enemy.remaining + 4),
    }));
  }
  return {
    state: finishWave({
      ...state,
      enemies,
      streak,
      bestStreak: Math.max(streak, state.bestStreak),
      shields: team ? Math.min(2, state.shields + 1) : state.shields,
      cleared: state.cleared + 1,
    }),
    event: team ? 'team' : 'strike',
  };
}

/** Focus and visibility pausing live in the canvas adapter, not in game rules. */
export function tickDefense(
  state: DefenseState,
  seconds: number,
): { state: DefenseState; event: DefenseEvent } {
  if (state.phase !== 'playing' || !Number.isFinite(seconds) || seconds <= 0) {
    return { state, event: null };
  }
  let health = state.health,
    shields = state.shields;
  let event: DefenseEvent = null;
  const enemies: DefenseEnemy[] = [];
  for (const enemy of state.enemies) {
    const remaining = enemy.remaining - seconds;
    if (remaining > 0) enemies.push({ ...enemy, remaining });
    else if (shields > 0) {
      shields--;
      event = event === 'hurt' ? event : 'shield';
    } else {
      health = Math.max(0, health - (enemy.kind === 'boss' ? 40 : 20));
      event = 'hurt';
    }
  }
  // The boss must be typed away, not skipped by surviving its deadline.
  if (state.wave > DEFENSE_WAVES && !enemies.length && health > 0) {
    const boss = state.enemies[0];
    enemies.push({ ...boss, typed: 0, clean: false, remaining: boss.travelSeconds });
  }
  return {
    state: finishWave({
      ...state,
      health,
      shields,
      enemies,
      elapsed: state.elapsed + seconds,
      streak: event ? 0 : state.streak,
    }),
    event,
  };
}
