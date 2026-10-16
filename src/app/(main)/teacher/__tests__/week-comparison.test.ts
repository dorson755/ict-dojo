import {
  compareWeeks,
  isHistoryTruncated,
  mostImproved,
  sessionsInWindow,
  weekTotals,
  type ComparableLearner,
} from '../week-comparison';

const DAY = 86_400_000;
const NOW = new Date('2026-10-17T04:00:00Z').getTime();

function session(daysAgo: number, wpm = 20, accuracy = 90, durationMs = 60_000) {
  return { created_at: new Date(NOW - daysAgo * DAY).toISOString(), wpm, accuracy, durationMs };
}

function learner(name: string, sessions: ReturnType<typeof session>[], extra: Partial<ComparableLearner> = {}): ComparableLearner {
  return { display_name: name, sessions, ...extra };
}

describe('sessionsInWindow', () => {
  it('splits history into this week and last week without overlap', () => {
    const sessions = [session(0.5), session(6.9), session(7.1), session(13.9), session(14.5)];
    expect(sessionsInWindow(sessions, NOW, 0)).toHaveLength(2);
    expect(sessionsInWindow(sessions, NOW, 7)).toHaveLength(2);
  });

  it('puts a session exactly 7 days old in this week, matching the report', () => {
    const sessions = [session(7)];
    expect(sessionsInWindow(sessions, NOW, 0)).toHaveLength(1);
    expect(sessionsInWindow(sessions, NOW, 7)).toHaveLength(0);
  });

  it('never counts one session in both weeks', () => {
    const sessions = [session(0), session(3), session(7), session(10), session(14), session(14.001)];
    const thisWeek = sessionsInWindow(sessions, NOW, 0).length;
    const lastWeek = sessionsInWindow(sessions, NOW, 7).length;
    expect(thisWeek + lastWeek).toBeLessThanOrEqual(sessions.length);
    expect(thisWeek).toBe(3);
    expect(lastWeek).toBe(2);
  });

  it('ignores sessions with missing or invalid timestamps', () => {
    const sessions = [{ created_at: undefined }, { created_at: 'not a date' }, session(1)];
    expect(sessionsInWindow(sessions, NOW, 0)).toHaveLength(1);
  });
});

describe('weekTotals', () => {
  it('sums sessions and minutes, averages speed and accuracy, and counts learners who practiced', () => {
    const totals = weekTotals([
      learner('A', [session(1, 20, 90, 120_000), session(2, 30, 80, 60_000)]),
      learner('B', [session(3, 10, 70, 60_000)]),
      learner('C', []),
    ], NOW, 0);
    expect(totals).toEqual({ sessions: 3, minutes: 4, wpm: 20, accuracy: 80, practicedLearners: 2 });
  });

  it('returns null averages when nothing was recorded', () => {
    expect(weekTotals([learner('A', [])], NOW, 0)).toEqual({ sessions: 0, minutes: 0, wpm: null, accuracy: null, practicedLearners: 0 });
  });

  it('excludes invalid sessions from speed but still counts them as practice', () => {
    const invalid = { ...session(1, 90, 50), isValid: false };
    const totals = weekTotals([learner('A', [invalid, session(2, 20, 90)])], NOW, 0);
    expect(totals.sessions).toBe(2);
    expect(totals.wpm).toBe(20);
  });
});

describe('compareWeeks', () => {
  it('reports both weeks and is reliable when no history is cut off', () => {
    const result = compareWeeks([learner('A', [session(1), session(2), session(9)])], NOW);
    expect(result.thisWeek.sessions).toBe(2);
    expect(result.lastWeek.sessions).toBe(1);
    expect(result.reliable).toBe(true);
  });

  it('is unreliable when any learner history is truncated', () => {
    const result = compareWeeks([learner('A', [session(1)], { historyTruncated: true })], NOW);
    expect(result.reliable).toBe(false);
  });
});

describe('isHistoryTruncated', () => {
  it('is false when the cap was not reached', () => {
    expect(isHistoryTruncated([session(1), session(2)], 200, NOW)).toBe(false);
  });

  it('is true when the cap was reached and the oldest session is inside the 14-day window', () => {
    const sessions = Array.from({ length: 5 }, (_, index) => session(index));
    expect(isHistoryTruncated(sessions, 5, NOW)).toBe(true);
  });

  it('is false when the cap was reached but the oldest session is already older than 14 days', () => {
    const sessions = [session(1), session(2), session(20)];
    expect(isHistoryTruncated(sessions, 3, NOW)).toBe(false);
  });
});

describe('mostImproved', () => {
  it('ranks by WPM gain and reports both weeks', () => {
    const result = mostImproved([
      learner('Small', [session(1, 22), session(2, 22), session(8, 20), session(9, 20)]),
      learner('Big', [session(1, 40), session(2, 40), session(8, 20), session(9, 20)]),
    ], NOW);
    expect(result.map((item) => item.name)).toEqual(['Big', 'Small']);
    expect(result[0]).toMatchObject({ wpmChange: 20, thisWpm: 40, lastWpm: 20 });
  });

  it('needs at least two valid sessions in both weeks', () => {
    const result = mostImproved([
      learner('OneRun', [session(1, 60), session(8, 20), session(9, 20)]),
      learner('NoLastWeek', [session(1, 40), session(2, 40)]),
    ], NOW);
    expect(result).toEqual([]);
  });

  it('ignores gains smaller than two WPM and any decline', () => {
    const result = mostImproved([
      learner('Flat', [session(1, 21), session(2, 21), session(8, 20), session(9, 20)]),
      learner('Down', [session(1, 10), session(2, 10), session(8, 20), session(9, 20)]),
    ], NOW);
    expect(result).toEqual([]);
  });

  it('skips learners whose history is truncated, since last week is incomplete', () => {
    const result = mostImproved([
      learner('Cut', [session(1, 50), session(2, 50), session(8, 10), session(9, 10)], { historyTruncated: true }),
    ], NOW);
    expect(result).toEqual([]);
  });

  it('limits the list to three', () => {
    const many = Array.from({ length: 5 }, (_, index) =>
      learner(`L${index}`, [session(1, 30 + index), session(2, 30 + index), session(8, 20), session(9, 20)]));
    expect(mostImproved(many, NOW)).toHaveLength(3);
  });
});
