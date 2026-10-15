export interface SessionLike {
  created_at?: unknown;
  wpm?: unknown;
  accuracy?: unknown;
  durationMs?: unknown;
  isValid?: unknown;
}

export interface DayPoint {
  /** Local calendar day as YYYY-MM-DD. */
  day: string;
  /** Mean WPM across that day's valid sessions. */
  wpm: number;
  accuracy: number;
  sessions: number;
}

const DAY_MS = 86_400_000;

export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Sessions flagged invalid (or with no usable WPM) would drag trends around,
 * so every chart reads from this filtered view.
 */
export function validSessions<T extends SessionLike>(sessions: T[]): T[] {
  return sessions.filter((session) => {
    if (session.isValid === false) return false;
    const wpm = Number(session.wpm);
    return Number.isFinite(wpm) && wpm > 0 && toDate(session.created_at) !== null;
  });
}

/** One point per practice day, oldest first. */
export function dailySeries(sessions: SessionLike[]): DayPoint[] {
  const buckets = new Map<string, { wpm: number[]; accuracy: number[] }>();
  for (const session of validSessions(sessions)) {
    const key = dayKey(toDate(session.created_at)!);
    const bucket = buckets.get(key) ?? { wpm: [], accuracy: [] };
    bucket.wpm.push(Number(session.wpm));
    const accuracy = Number(session.accuracy);
    if (Number.isFinite(accuracy) && accuracy > 0) bucket.accuracy.push(accuracy);
    buckets.set(key, bucket);
  }
  const mean = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, bucket]) => ({
      day,
      wpm: Math.round(mean(bucket.wpm) * 10) / 10,
      accuracy: Math.round(mean(bucket.accuracy)),
      sessions: bucket.wpm.length,
    }));
}

export interface WpmSummary {
  latest: number;
  best: number;
  /** Change from the earlier half of the series to the later half, in WPM. */
  change: number;
  direction: 'up' | 'down' | 'flat' | 'none';
  points: number;
}

const FLAT_BAND_WPM = 1;

export function summarizeWpm(series: DayPoint[]): WpmSummary {
  if (!series.length) return { latest: 0, best: 0, change: 0, direction: 'none', points: 0 };
  const latest = series[series.length - 1].wpm;
  const best = Math.max(...series.map((point) => point.wpm));
  if (series.length < 2) return { latest, best, change: 0, direction: 'flat', points: series.length };

  const mid = Math.floor(series.length / 2);
  const mean = (points: DayPoint[]) => points.reduce((sum, point) => sum + point.wpm, 0) / points.length;
  const change = Math.round((mean(series.slice(mid)) - mean(series.slice(0, mid))) * 10) / 10;
  const direction = Math.abs(change) < FLAT_BAND_WPM ? 'flat' : change > 0 ? 'up' : 'down';
  return { latest, best, change, direction, points: series.length };
}

export interface ActivityDay {
  day: string;
  sessions: number;
  minutes: number;
  learners: number;
}

/** A fixed window ending today, so quiet days still show as empty bars. */
export function activityWindow(
  sessionsByLearner: SessionLike[][],
  days: number,
  now: Date = new Date(),
): ActivityDay[] {
  const window: ActivityDay[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    window.push({ day: dayKey(new Date(now.getTime() - offset * DAY_MS)), sessions: 0, minutes: 0, learners: 0 });
  }
  const index = new Map(window.map((entry, position) => [entry.day, position]));

  for (const sessions of sessionsByLearner) {
    const seen = new Set<number>();
    for (const session of sessions) {
      const date = toDate(session.created_at);
      if (!date) continue;
      const position = index.get(dayKey(date));
      if (position === undefined) continue;
      window[position].sessions += 1;
      window[position].minutes += (Number(session.durationMs) || 0) / 60_000;
      seen.add(position);
    }
    for (const position of seen) window[position].learners += 1;
  }
  return window.map((entry) => ({ ...entry, minutes: Math.round(entry.minutes) }));
}

/**
 * Class-wide WPM per day: the mean of each learner's own daily average, so a
 * learner who practices twenty times does not outweigh one who practices twice.
 */
export function classSeries(seriesByLearner: DayPoint[][]): DayPoint[] {
  const buckets = new Map<string, { wpm: number[]; accuracy: number[]; sessions: number }>();
  for (const series of seriesByLearner) {
    for (const point of series) {
      const bucket = buckets.get(point.day) ?? { wpm: [], accuracy: [], sessions: 0 };
      bucket.wpm.push(point.wpm);
      if (point.accuracy > 0) bucket.accuracy.push(point.accuracy);
      bucket.sessions += point.sessions;
      buckets.set(point.day, bucket);
    }
  }
  const mean = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, bucket]) => ({
      day,
      wpm: Math.round(mean(bucket.wpm) * 10) / 10,
      accuracy: Math.round(mean(bucket.accuracy)),
      sessions: bucket.sessions,
    }));
}

/** Short axis label such as "10/7". */
export function shortDay(day: string): string {
  const [, month, date] = day.split('-');
  return `${Number(month)}/${Number(date)}`;
}

export interface Bucket {
  label: string;
  count: number;
}

/** Counts learners per WPM band. `edges` are inclusive lower bounds. */
export function wpmDistribution(values: number[], edges: number[] = [0, 15, 25, 35, 45, 60]): Bucket[] {
  const buckets: Bucket[] = edges.map((edge, index) => ({
    label: index === edges.length - 1 ? `${edge}+` : `${edge}-${edges[index + 1] - 1}`,
    count: 0,
  }));
  for (const value of values) {
    if (!Number.isFinite(value) || value <= 0) continue;
    let target = 0;
    for (let index = 0; index < edges.length; index += 1) if (value >= edges[index]) target = index;
    buckets[target].count += 1;
  }
  return buckets;
}
