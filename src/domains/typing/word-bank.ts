/**
 * Word pool for the falling-words game, weighted toward the learner's weak keys.
 * Every game session logs real keystrokes through the same pipeline as practice,
 * so the words here are plain lowercase letters only.
 */

/** Lowercase, 3–9 letters, no repeats. A test guards these invariants. */
export const GAME_WORDS = [
  'the', 'and', 'for', 'you', 'not', 'new', 'old', 'one', 'two', 'six',
  'ten', 'top', 'tap', 'run', 'win', 'key', 'row', 'fix', 'zip', 'jam',
  'fox', 'box', 'owl', 'zoo', 'sun', 'fun', 'hop', 'tag', 'mix', 'van',
  'web', 'net', 'pen', 'map', 'cap', 'toe', 'arm', 'ear', 'eye', 'age',
  'end', 'ice', 'oil', 'tip', 'let', 'get', 'set', 'put', 'use', 'say',
  'see', 'way', 'day', 'may', 'pay', 'try', 'fly', 'why', 'now', 'how',
  'who', 'its', 'his', 'her', 'our', 'out', 'too', 'yet', 'few', 'big',
  'time', 'type', 'code', 'data', 'fast', 'slow', 'hard', 'easy', 'word', 'work',
  'hand', 'left', 'down', 'over', 'back', 'then', 'when', 'what', 'will', 'your',
  'them', 'than', 'this', 'that', 'with', 'have', 'from', 'they', 'each', 'make',
  'like', 'just', 'know', 'take', 'into', 'year', 'good', 'some', 'very', 'best',
  'next', 'last', 'keep', 'kind', 'mind', 'find', 'help', 'home', 'name', 'line',
  'page', 'note', 'quiz', 'buzz', 'jump', 'quit', 'copy', 'save', 'file', 'link',
  'load', 'item', 'list', 'text', 'font', 'bold', 'desk', 'dojo', 'belt', 'rank',
  'star', 'goal', 'game', 'play', 'beat', 'test', 'blue', 'calm', 'four', 'five',
  'speed', 'score', 'level', 'drill', 'skill', 'chart', 'reach', 'teach', 'learn', 'write',
  'quick', 'sharp', 'smart', 'white', 'black', 'brown', 'green', 'world', 'story', 'class',
  'study', 'focus', 'power', 'pride', 'honor', 'peace', 'trace', 'space', 'enter', 'shift',
  'comma', 'quote', 'slash', 'colon', 'brace', 'mouse', 'pixel', 'robot', 'email', 'cloud',
  'debug', 'print', 'input', 'cache', 'agile', 'stuck', 'brave', 'punch', 'guard', 'block',
  'master', 'coding', 'syntax', 'rhythm', 'strong', 'smooth', 'steady', 'sprint', 'strike', 'yellow',
  'orange', 'purple', 'silver', 'golden', 'stream', 'screen', 'letter', 'number', 'finger', 'target',
  'record', 'result', 'review', 'repeat', 'return', 'string', 'binary', 'vector', 'method', 'school',
  'lesson', 'energy', 'spirit', 'wisdom', 'temple', 'banner', 'center', 'double', 'balance', 'control',
  'pattern', 'program', 'passage', 'profile', 'session', 'capture', 'journey', 'warrior', 'student', 'teacher',
  'advance', 'improve', 'process', 'express', 'command', 'bracket', 'keyboard', 'practice', 'champion', 'accuracy',
  'progress', 'solution', 'function', 'variable', 'technique', 'precision', 'challenge', 'knowledge', 'character', 'excellent',
  'wonderful', 'important', 'community', 'curiosity', 'attention',
] as const;

export interface PickOptions {
  pool?: string[];
  /** Injectable randomness so tests are deterministic. */
  rand?: () => number;
}

/** Weak keys normalized to lowercase; whitespace and zero weights are meaningless here. */
function normalizedWeakKeys(weakKeys: Record<string, number>): Map<string, number> {
  const map = new Map<string, number>();
  for (const [char, weight] of Object.entries(weakKeys)) {
    const key = char.trim().toLowerCase();
    if (!key || !(weight > 0)) continue;
    map.set(key, Math.max(map.get(key) ?? 0, weight));
  }
  return map;
}

function wordScore(word: string, weak: Map<string, number>): number {
  let score = 0;
  const seen = new Set<string>();
  for (const char of word) {
    const key = char.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    score += weak.get(key) ?? 0;
  }
  return score;
}

function sample(items: string[], n: number, weights: number[] | undefined, rand: () => number): string[] {
  const pool = [...items];
  const w = pool.map((_, index) => weights?.[index] ?? 1);
  const out: string[] = [];
  while (out.length < n && pool.length > 0) {
    const total = w.reduce((sum, value) => sum + value, 0);
    let threshold = rand() * total;
    let index = pool.length - 1;
    for (let i = 0; i < pool.length; i++) {
      threshold -= w[i];
      if (threshold <= 0) {
        index = i;
        break;
      }
    }
    out.push(pool[index]);
    pool.splice(index, 1);
    w.splice(index, 1);
  }
  return out;
}

function shuffle(items: string[], rand: () => number): string[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Words for one game round. When the learner has weak keys, at least 60% of the
 * words contain one of them (weighted toward the worst keys), so the round is
 * real practice for the mistakes that matter instead of random noise.
 */
export function pickGameWords(weakKeys: Record<string, number>, count: number, options: PickOptions = {}): string[] {
  const rand = options.rand ?? Math.random;
  const pool = [...new Set(options.pool ?? GAME_WORDS)];
  const n = Math.max(0, Math.min(count, pool.length));
  if (n === 0) return [];

  const weak = normalizedWeakKeys(weakKeys);
  const matching = pool.filter((word) => wordScore(word, weak) > 0);
  const rest = pool.filter((word) => wordScore(word, weak) === 0);

  const quota = Math.min(matching.length, Math.ceil(n * 0.6));
  const picked = [
    ...sample(matching, quota, matching.map((word) => 1 + wordScore(word, weak)), rand),
    ...sample(rest, n - quota, undefined, rand),
  ];
  // If the non-matching pool ran short, finish the round with extra weak-key words.
  const used = new Set(picked);
  if (picked.length < n) {
    picked.push(...sample(matching.filter((word) => !used.has(word)), n - picked.length, undefined, rand));
  }
  return shuffle(picked, rand);
}

/** The learner's worst printable characters, strongest first, for display. */
export function topWeakChars(weakKeys: Record<string, number>, limit = 5): string[] {
  return Object.entries(weakKeys)
    .filter(([char, weight]) => char.trim().length > 0 && weight > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([char]) => char);
}
