import {
  modeBreakdown,
  practiceRhythm,
  problemKeys,
  progressNarrative,
  skillGrowth,
  spokenPair,
  topPairSlips,
  visiblePair,
} from '../personal-trends';

const session = (iso: string, wpm: number, accuracy: number, extra: Record<string, unknown> = {}) => ({
  created_at: iso,
  wpm,
  accuracy,
  ...extra,
});

describe('modeBreakdown', () => {
  it('averages each mode and lists the most-used first', () => {
    const stats = modeBreakdown([
      session('2026-10-01T10:00:00', 30, 90, { mode: 'accuracy' }),
      session('2026-10-01T10:10:00', 40, 100, { mode: 'accuracy' }),
      session('2026-10-02T10:00:00', 20, 80, { mode: 'rhythm' }),
    ]);
    expect(stats.map((stat) => stat.mode)).toEqual(['accuracy', 'rhythm']);
    expect(stats[0]).toMatchObject({ sessions: 2, wpm: 35, accuracy: 95, label: 'Accuracy' });
  });

  it('groups sessions without a mode under other and skips invalid ones', () => {
    const stats = modeBreakdown([
      session('2026-10-01T10:00:00', 30, 90),
      session('2026-10-01T10:05:00', 50, 90, { mode: 'technique', isValid: false }),
    ]);
    expect(stats).toHaveLength(1);
    expect(stats[0].mode).toBe('other');
  });
});

describe('skillGrowth', () => {
  const catalog = new Set(['typing-home-row', 'typing-top-row']);
  const row = (skill_id: string, previous_score: number, new_score: number, created_at: string) => ({ skill_id, previous_score, new_score, created_at });

  it('does not count the opening jump from zero as growth', () => {
    const [growth] = skillGrowth([row('typing-home-row', 0, 85, '2026-09-17T10:00:00Z')], catalog);
    expect(growth.scores).toEqual([85]);
    expect(growth.first).toBe(85);
    expect(growth.change).toBe(0);
    expect(growth.updates).toBe(1);
  });

  it('measures change from the first assessed score and orders by time', () => {
    const [growth] = skillGrowth([
      row('typing-home-row', 85, 80, '2026-09-20T10:00:00Z'),
      row('typing-home-row', 0, 85, '2026-09-17T10:00:00Z'),
    ], catalog);
    expect(growth.scores).toEqual([85, 80]);
    expect(growth.latest).toBe(80);
    expect(growth.change).toBe(-5);
    expect(growth.updates).toBe(2);
  });

  it('reports real improvement across several updates', () => {
    const [growth] = skillGrowth([
      row('typing-home-row', 0, 51.4, '2026-09-15T10:00:00Z'),
      row('typing-home-row', 51.4, 68.4, '2026-09-23T10:00:00Z'),
      row('typing-home-row', 68.4, 74.4, '2026-09-23T11:00:00Z'),
    ], catalog);
    expect(growth.change).toBe(23);
  });

  it('ignores skills outside the catalog and rows without a score', () => {
    const result = skillGrowth([
      row('00000000-0000-0000-0000-000000000001', 0, 50, '2026-09-17T10:00:00Z'),
      { skill_id: 'typing-top-row', created_at: '2026-09-17T10:00:00Z' },
    ], catalog);
    expect(result).toEqual([]);
  });

  it('puts the most-practiced skill first', () => {
    const result = skillGrowth([
      row('typing-top-row', 0, 60, '2026-09-17T10:00:00Z'),
      row('typing-home-row', 0, 70, '2026-09-17T10:00:00Z'),
      row('typing-home-row', 70, 75, '2026-09-18T10:00:00Z'),
    ], catalog);
    expect(result.map((entry) => entry.skillId)).toEqual(['typing-home-row', 'typing-top-row']);
  });
});

describe('problemKeys', () => {
  it('scales intensity against the learner\'s own worst key', () => {
    const keys = problemKeys({ a: 9, b: 4.5, c: 0.9 });
    expect(keys.map((entry) => entry.key)).toEqual(['a', 'b', 'c']);
    expect(keys[0].intensity).toBe(1);
    expect(keys[1].intensity).toBe(0.5);
  });

  it('gives learners on different scales the same shape', () => {
    expect(problemKeys({ x: 0.9, y: 0.45 })[1].intensity).toBe(problemKeys({ x: 9, y: 4.5 })[1].intensity);
  });

  it('handles missing, empty and non-positive weights', () => {
    expect(problemKeys(undefined)).toEqual([]);
    expect(problemKeys({})).toEqual([]);
    expect(problemKeys({ a: 0, b: -1 })).toEqual([]);
  });

  it('respects the limit', () => {
    expect(problemKeys({ a: 3, b: 2, c: 1 }, 2)).toHaveLength(2);
  });
});

describe('topPairSlips', () => {
  it('sums counts across sessions and sorts by frequency', () => {
    const slips = topPairSlips([
      { keyPairErrors: [{ pair: 'th', count: 2 }, { pair: 'e ', count: 1 }] },
      { keyPairErrors: [{ pair: 'th', count: 3 }] },
    ]);
    expect(slips).toEqual([{ pair: 'th', count: 5 }, { pair: 'e ', count: 1 }]);
  });

  it('skips malformed entries', () => {
    expect(topPairSlips([
      { keyPairErrors: [{ pair: 'abc', count: 4 }, { pair: 'ab', count: 0 }, { count: 2 }, null] },
      { keyPairErrors: 'nope' },
      {},
    ])).toEqual([]);
  });
});

describe('visiblePair', () => {
  it('shows spaces as a visible symbol', () => {
    expect(visiblePair('e ')).toBe('e␣');
    expect(visiblePair(' t')).toBe('␣t');
  });
});

describe('spokenPair', () => {
  it('spells out spaces and joins keys in order', () => {
    expect(spokenPair('th')).toBe('t then h');
    expect(spokenPair('e ')).toBe('e then space');
    expect(spokenPair(' t')).toBe('space then t');
  });
});

describe('practiceRhythm', () => {
  it('returns zeros when there is no practice', () => {
    expect(practiceRhythm([])).toEqual({ activeDays: 0, spanDays: 0, longestStreak: 0, sessionsPerActiveDay: 0 });
  });

  it('finds the longest run of consecutive days', () => {
    const rhythm = practiceRhythm([
      session('2026-10-01T10:00:00', 30, 90),
      session('2026-10-02T10:00:00', 30, 90),
      session('2026-10-03T10:00:00', 30, 90),
      session('2026-10-07T10:00:00', 30, 90),
      session('2026-10-07T11:00:00', 30, 90),
    ]);
    expect(rhythm.activeDays).toBe(4);
    expect(rhythm.spanDays).toBe(7);
    expect(rhythm.longestStreak).toBe(3);
    expect(rhythm.sessionsPerActiveDay).toBe(1.3);
  });
});

describe('progressNarrative', () => {
  const base = {
    practiceDays: 4,
    sessions: 20,
    firstWpm: 20,
    latestWpm: 30,
    bestWpm: 32,
    firstAccuracy: 90,
    latestAccuracy: 92,
    weakSkillNames: [] as string[],
    masteredCount: 0,
    daysSincePractice: 1 as number | null,
  };

  it('says so when there are no sessions', () => {
    expect(progressNarrative({ ...base, sessions: 0 })).toEqual({ headline: 'No typing sessions recorded yet.', points: [] });
  });

  it('refuses to read a trend from a single practice day', () => {
    const result = progressNarrative({ ...base, practiceDays: 1 });
    expect(result.headline).toBe('Just getting started.');
    expect(result.points[0]).toMatch(/no trend to read yet/);
  });

  it('reports a speed gain', () => {
    const result = progressNarrative(base);
    expect(result.headline).toBe('Getting faster.');
    expect(result.points).toContain('Speed is up 10 WPM since the first practice day.');
    expect(result.points).toContain('Accuracy is holding steady around 92%.');
  });

  it('raises the rushing flag only with several days and a clear accuracy drop', () => {
    const result = progressNarrative({ ...base, latestAccuracy: 82 });
    expect(result.points.some((point) => /rushing/.test(point))).toBe(true);
  });

  it('does not suggest rushing from a small accuracy dip', () => {
    const result = progressNarrative({ ...base, latestAccuracy: 86 });
    expect(result.points).toContain('Accuracy has slipped by 4 points.');
    expect(result.points.some((point) => /rushing/.test(point))).toBe(false);
  });

  it('does not suggest rushing from too few practice days', () => {
    const result = progressNarrative({ ...base, practiceDays: 2, latestAccuracy: 80 });
    expect(result.points.some((point) => /rushing/.test(point))).toBe(false);
  });

  it('reports a speed drop', () => {
    const result = progressNarrative({ ...base, latestWpm: 15 });
    expect(result.headline).toBe('Speed has dropped.');
    expect(result.points).toContain('Speed is down 5 WPM since the first practice day.');
  });

  it('treats small movement as level', () => {
    const result = progressNarrative({ ...base, latestWpm: 21 });
    expect(result.headline).toBe('Steady progress.');
  });

  it('names weak skills and flags long absences', () => {
    const result = progressNarrative({ ...base, weakSkillNames: ['Top row', 'Chunks'], daysSincePractice: 20 });
    expect(result.points).toContain('Needs reinforcement: Top row, Chunks.');
    expect(result.points).toContain('Last practiced 20 days ago.');
  });

  it('celebrates mastery only when nothing is weak', () => {
    expect(progressNarrative({ ...base, masteredCount: 2 }).points).toContain('2 skills mastered with nothing flagged as weak.');
    expect(progressNarrative({ ...base, masteredCount: 2, weakSkillNames: ['Chunks'] }).points.join(' ')).not.toMatch(/mastered/);
  });
});
