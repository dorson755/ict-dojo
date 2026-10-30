import { GAME_WORDS, pickGameWords, topWeakChars } from '../word-bank';

// Deterministic rand: a fixed sequence, or a constant for uniform tests.
function sequence(...values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

describe('GAME_WORDS', () => {
  it('is a proper game pool: unique lowercase letters, 3 to 9 characters', () => {
    const seen = new Set<string>();
    for (const word of GAME_WORDS) {
      expect(seen.has(word)).toBe(false);
      seen.add(word);
      expect(word).toMatch(/^[a-z]+$/);
      expect(word.length).toBeGreaterThanOrEqual(3);
      expect(word.length).toBeLessThanOrEqual(9);
    }
    expect(GAME_WORDS.length).toBeGreaterThanOrEqual(150);
  });
});

describe('pickGameWords', () => {
  const pool = ['cat', 'cot', 'cut', 'cap', 'dog', 'dig', 'bat', 'bit', 'sun', 'sky'];

  it('returns the requested number of unique words from the pool', () => {
    const words = pickGameWords({}, 5, { pool, rand: sequence(0.99, 0.5, 0.5, 0.5, 0.5, 0.5) });
    expect(words).toHaveLength(5);
    expect(new Set(words).size).toBe(5);
    for (const word of words) expect(pool).toContain(word);
  });

  it('never returns more words than the pool holds', () => {
    const words = pickGameWords({ z: 5 }, 50, { pool });
    expect(words).toHaveLength(pool.length);
    expect(new Set(words).size).toBe(pool.length);
  });

  it('includes every matching word when there are too few to fill the quota', () => {
    const words = pickGameWords({ t: 9 }, 10, { pool, rand: sequence(0.99, 0.5, 0.5) });
    expect(words).toHaveLength(10);
    const withT = words.filter((word) => word.includes('t'));
    // ceil(10 * 0.6) = 6, but the pool only holds five t-words, so all of them appear.
    expect(withT.length).toBe(5);
  });

  it('fills at least 60% of the batch with weak-key words when enough exist', () => {
    for (const rand of [() => 0.1, () => 0.5, () => 0.99]) {
      const words = pickGameWords({ t: 9 }, 5, { pool, rand });
      expect(words).toHaveLength(5);
      expect(words.filter((word) => word.includes('t')).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('matches weak keys case-insensitively', () => {
    const words = pickGameWords({ T: 9 }, 6, { pool, rand: sequence(0.99, 0.5) });
    expect(words.filter((word) => word.includes('t')).length).toBeGreaterThanOrEqual(4);
  });

  it('falls back to plain words when the weak key appears in no word', () => {
    const words = pickGameWords({ ';': 4, ' ': 8 }, 5, { pool, rand: sequence(0.99, 0.5, 0.5) });
    expect(words).toHaveLength(5);
    expect(new Set(words).size).toBe(5);
  });

  it('uses the full game word bank by default', () => {
    const words = pickGameWords({}, 12);
    expect(words).toHaveLength(12);
    for (const word of words) expect(GAME_WORDS).toContain(word);
  });

  it('handles an empty request', () => {
    expect(pickGameWords({ a: 1 }, 0, { pool })).toEqual([]);
  });
});

describe('topWeakChars', () => {
  it('lists the heaviest printable characters first', () => {
    expect(topWeakChars({ o: 4, ' ': 99, t: 8, s: 1 })).toEqual(['t', 'o', 's']);
  });

  it('caps the list', () => {
    const weak: Record<string, number> = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 };
    expect(topWeakChars(weak, 3)).toEqual(['f', 'e', 'd']);
  });

  it('is empty when there is nothing meaningful', () => {
    expect(topWeakChars({})).toEqual([]);
    expect(topWeakChars({ ' ': 5 })).toEqual([]);
  });
});
