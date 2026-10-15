import {
  activityWindow,
  classSeries,
  dailySeries,
  dayKey,
  daysSinceLatest,
  shortDay,
  summarizeWpm,
  validSessions,
  wpmDistribution,
} from '../progress';

const at = (iso: string, wpm: number, extra: Record<string, unknown> = {}) => ({
  created_at: iso,
  wpm,
  accuracy: 90,
  durationMs: 60_000,
  ...extra,
});

describe('validSessions', () => {
  it('drops invalid, zero-WPM and undated sessions', () => {
    const sessions = [
      at('2026-10-01T12:00:00', 30),
      at('2026-10-01T12:05:00', 40, { isValid: false }),
      at('2026-10-01T12:10:00', 0),
      { wpm: 25, accuracy: 90 },
    ];
    expect(validSessions(sessions)).toHaveLength(1);
  });
});

describe('dailySeries', () => {
  it('averages sessions on the same day and sorts oldest first', () => {
    const series = dailySeries([
      at('2026-10-03T12:00:00', 40),
      at('2026-10-01T09:00:00', 20),
      at('2026-10-01T15:00:00', 30),
    ]);
    expect(series.map((point) => point.day)).toEqual(['2026-10-01', '2026-10-03']);
    expect(series[0]).toMatchObject({ wpm: 25, sessions: 2 });
    expect(series[1]).toMatchObject({ wpm: 40, sessions: 1 });
  });

  it('returns nothing when there are no valid sessions', () => {
    expect(dailySeries([])).toEqual([]);
    expect(dailySeries([at('2026-10-01T12:00:00', 30, { isValid: false })])).toEqual([]);
  });
});

describe('summarizeWpm', () => {
  const series = (...wpms: number[]) => wpms.map((wpm, index) => ({ day: `2026-10-0${index + 1}`, wpm, accuracy: 90, sessions: 1 }));

  it('reports no data for an empty series', () => {
    expect(summarizeWpm([]).direction).toBe('none');
  });

  it('treats a single point as flat', () => {
    expect(summarizeWpm(series(30))).toMatchObject({ latest: 30, best: 30, direction: 'flat' });
  });

  it('detects improvement by comparing halves', () => {
    const summary = summarizeWpm(series(20, 22, 30, 34));
    expect(summary.direction).toBe('up');
    expect(summary.change).toBe(11);
    expect(summary.best).toBe(34);
    expect(summary.latest).toBe(34);
  });

  it('detects decline', () => {
    expect(summarizeWpm(series(40, 38, 25, 22)).direction).toBe('down');
  });

  it('ignores movement under one WPM', () => {
    expect(summarizeWpm(series(30, 30.4, 30.2, 30.5)).direction).toBe('flat');
  });
});

describe('activityWindow', () => {
  const now = new Date(2026, 9, 14, 12, 0, 0);

  it('returns a fixed number of days ending today, including empty days', () => {
    const window = activityWindow([], 7, now);
    expect(window).toHaveLength(7);
    expect(window[6].day).toBe(dayKey(now));
    expect(window.every((entry) => entry.sessions === 0)).toBe(true);
  });

  it('counts sessions, minutes and distinct learners per day', () => {
    const today = new Date(2026, 9, 14, 9, 0, 0).toISOString();
    const yesterday = new Date(2026, 9, 13, 9, 0, 0).toISOString();
    const window = activityWindow(
      [
        [at(today, 30), at(today, 31), at(yesterday, 28)],
        [at(today, 40)],
      ],
      3,
      now,
    );
    const last = window[2];
    expect(last.sessions).toBe(3);
    expect(last.learners).toBe(2);
    expect(last.minutes).toBe(3);
    expect(window[1].sessions).toBe(1);
  });

  it('ignores sessions outside the window', () => {
    const old = new Date(2026, 8, 1, 9, 0, 0).toISOString();
    expect(activityWindow([[at(old, 30)]], 7, now).every((entry) => entry.sessions === 0)).toBe(true);
  });
});

describe('classSeries', () => {
  const point = (day: string, wpm: number, sessions = 1) => ({ day, wpm, accuracy: 90, sessions });

  it('weights each learner equally regardless of how often they practiced', () => {
    const heavy = [point('2026-10-01', 20, 20)];
    const light = [point('2026-10-01', 40, 1)];
    const combined = classSeries([heavy, light]);
    expect(combined).toHaveLength(1);
    expect(combined[0].wpm).toBe(30);
    expect(combined[0].sessions).toBe(21);
  });

  it('merges days across learners in order', () => {
    const combined = classSeries([[point('2026-10-03', 30)], [point('2026-10-01', 10), point('2026-10-03', 50)]]);
    expect(combined.map((entry) => entry.day)).toEqual(['2026-10-01', '2026-10-03']);
    expect(combined[1].wpm).toBe(40);
  });

  it('returns nothing for an empty class', () => {
    expect(classSeries([])).toEqual([]);
  });
});

describe('daysSinceLatest', () => {
  const now = new Date(2026, 9, 14, 12, 0, 0).getTime();

  it('measures from the newest session regardless of order', () => {
    const sessions = [at(new Date(2026, 9, 1, 9).toISOString(), 30), at(new Date(2026, 9, 10, 9).toISOString(), 30)];
    expect(daysSinceLatest(sessions, now)).toBe(4);
  });

  it('returns null with no dated sessions and never goes negative', () => {
    expect(daysSinceLatest([], now)).toBeNull();
    expect(daysSinceLatest([at(new Date(2026, 9, 20).toISOString(), 30)], now)).toBe(0);
  });
});

describe('shortDay', () => {
  it('drops the year and leading zeros', () => {
    expect(shortDay('2026-10-07')).toBe('10/7');
    expect(shortDay('2026-01-15')).toBe('1/15');
  });
});

describe('wpmDistribution', () => {
  it('buckets learners by WPM band and skips non-positive values', () => {
    const buckets = wpmDistribution([5, 14, 15, 30, 44, 70, 0, NaN]);
    expect(buckets.map((bucket) => bucket.label)).toEqual(['0-14', '15-24', '25-34', '35-44', '45-59', '60+']);
    expect(buckets.map((bucket) => bucket.count)).toEqual([2, 1, 1, 1, 0, 1]);
  });
});
