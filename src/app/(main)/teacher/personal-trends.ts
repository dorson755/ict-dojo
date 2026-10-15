import { dayKey, validSessions, type SessionLike } from './progress';

export interface ModeSession extends SessionLike {
  mode?: unknown;
  keyPairErrors?: unknown;
}

export interface ModeStat {
  mode: string;
  label: string;
  sessions: number;
  wpm: number;
  accuracy: number;
}

const MODE_LABEL: Record<string, string> = {
  accuracy: 'Accuracy',
  technique: 'Technique',
  rhythm: 'Rhythm',
};

const MODE_ORDER = ['accuracy', 'technique', 'rhythm'];

/** Average speed and accuracy per practice mode, most-used mode first. */
export function modeBreakdown(sessions: ModeSession[]): ModeStat[] {
  const groups = new Map<string, { wpm: number[]; accuracy: number[] }>();
  for (const session of validSessions(sessions)) {
    const mode = typeof session.mode === 'string' && session.mode ? session.mode : 'other';
    const group = groups.get(mode) ?? { wpm: [], accuracy: [] };
    group.wpm.push(Number(session.wpm));
    const accuracy = Number(session.accuracy);
    if (Number.isFinite(accuracy) && accuracy > 0) group.accuracy.push(accuracy);
    groups.set(mode, group);
  }
  const mean = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);
  return [...groups.entries()]
    .map(([mode, group]) => ({
      mode,
      label: MODE_LABEL[mode] ?? 'Other',
      sessions: group.wpm.length,
      wpm: Math.round(mean(group.wpm) * 10) / 10,
      accuracy: Math.round(mean(group.accuracy)),
    }))
    .sort((a, b) => b.sessions - a.sessions || MODE_ORDER.indexOf(a.mode) - MODE_ORDER.indexOf(b.mode));
}

export interface MasteryHistoryRow {
  skill_id?: unknown;
  new_score?: unknown;
  previous_score?: unknown;
  created_at?: unknown;
}

export interface SkillGrowth {
  skillId: string;
  /** Assessed scores, oldest to newest. The 0 a skill starts from before its first assessment is not included. */
  scores: number[];
  /** The first assessed score. */
  first: number;
  latest: number;
  /** Change since the first assessment. Zero until a second update exists. */
  change: number;
  /** Number of assessments, not counting the starting zero. */
  updates: number;
}

/**
 * Builds a per-skill score line from mastery history.
 *
 * Every skill's history opens with `0 -> first score`, and first scores are
 * capped (often exactly 85), so treating that opening jump as growth would show
 * every skill as "+85". Growth is measured from the first assessed score instead,
 * and a skill with a single assessment reports no change.
 */
export function skillGrowth(rows: MasteryHistoryRow[], catalogIds: ReadonlySet<string>): SkillGrowth[] {
  const bySkill = new Map<string, MasteryHistoryRow[]>();
  for (const row of rows) {
    const skillId = String(row.skill_id ?? '');
    if (!catalogIds.has(skillId) || !Number.isFinite(Number(row.new_score))) continue;
    bySkill.set(skillId, [...(bySkill.get(skillId) ?? []), row]);
  }

  const growth: SkillGrowth[] = [];
  for (const [skillId, entries] of bySkill) {
    const ordered = [...entries].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    const scores = ordered.map((entry) => Math.round(Number(entry.new_score) * 10) / 10);
    const first = scores[0];
    const latest = scores[scores.length - 1];
    growth.push({
      skillId,
      scores,
      first,
      latest,
      change: scores.length > 1 ? Math.round((latest - first) * 10) / 10 : 0,
      updates: scores.length,
    });
  }
  return growth.sort((a, b) => b.updates - a.updates || b.latest - a.latest);
}

export interface ProblemKey {
  key: string;
  /** 0-1, relative to this learner's own worst key. */
  intensity: number;
}

/**
 * `weak_keys` weights are on a per-learner scale, so they only mean something
 * relative to that learner's own worst key. Returns the top keys, strongest first.
 */
export function problemKeys(weakKeys: Record<string, number> | undefined, limit = 10): ProblemKey[] {
  const entries = Object.entries(weakKeys ?? {}).filter(([, weight]) => Number.isFinite(weight) && weight > 0);
  if (!entries.length) return [];
  const max = Math.max(...entries.map(([, weight]) => weight));
  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, weight]) => ({ key, intensity: Math.round((weight / max) * 100) / 100 }));
}

export interface PairSlip {
  pair: string;
  count: number;
}

/** Most frequent key pairs a learner slipped on, summed over every session. */
export function topPairSlips(sessions: ModeSession[], limit = 6): PairSlip[] {
  const totals = new Map<string, number>();
  for (const session of sessions) {
    if (!Array.isArray(session.keyPairErrors)) continue;
    for (const entry of session.keyPairErrors as Array<{ pair?: unknown; count?: unknown }>) {
      const pair = typeof entry?.pair === 'string' ? entry.pair : '';
      const count = Number(entry?.count);
      if (pair.length !== 2 || !Number.isFinite(count) || count <= 0) continue;
      totals.set(pair, (totals.get(pair) ?? 0) + count);
    }
  }
  return [...totals.entries()]
    .map(([pair, count]) => ({ pair, count }))
    .sort((a, b) => b.count - a.count || a.pair.localeCompare(b.pair))
    .slice(0, limit);
}

/** Shows a space as a visible symbol so pairs like "e " read clearly. */
export function visiblePair(pair: string): string {
  return pair.replaceAll(' ', '␣');
}

/** Spoken form for assistive tech, which reads the space symbol poorly. */
export function spokenPair(pair: string): string {
  return [...pair].map((char) => (char === ' ' ? 'space' : char)).join(' then ');
}

export interface PracticeRhythm {
  activeDays: number;
  spanDays: number;
  /** Longest run of consecutive calendar days with practice. */
  longestStreak: number;
  sessionsPerActiveDay: number;
}

export function practiceRhythm(sessions: SessionLike[]): PracticeRhythm {
  const valid = validSessions(sessions);
  if (!valid.length) return { activeDays: 0, spanDays: 0, longestStreak: 0, sessionsPerActiveDay: 0 };

  const days = [...new Set(valid.map((session) => dayKey(new Date(String(session.created_at)))))].sort();
  const toNumber = (day: string) => {
    const [year, month, date] = day.split('-').map(Number);
    return Math.round(Date.UTC(year, month - 1, date) / 86_400_000);
  };
  const numbers = days.map(toNumber);

  let longest = 1;
  let run = 1;
  for (let index = 1; index < numbers.length; index += 1) {
    run = numbers[index] - numbers[index - 1] === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  return {
    activeDays: days.length,
    spanDays: numbers[numbers.length - 1] - numbers[0] + 1,
    longestStreak: longest,
    sessionsPerActiveDay: Math.round((valid.length / days.length) * 10) / 10,
  };
}

export interface ProgressNarrative {
  headline: string;
  points: string[];
}

interface NarrativeInput {
  practiceDays: number;
  sessions: number;
  firstWpm: number;
  latestWpm: number;
  bestWpm: number;
  firstAccuracy: number;
  latestAccuracy: number;
  weakSkillNames: string[];
  masteredCount: number;
  daysSincePractice: number | null;
}

const SIGNIFICANT_WPM = 2;
const SIGNIFICANT_ACCURACY = 3;
const RUSHING_MIN_DAYS = 3;
const RUSHING_ACCURACY_DROP = 5;

/**
 * Plain-language read of the numbers, so a teacher does not have to interpret
 * three charts to know where a learner stands. Every sentence is conditional on
 * enough data existing to support it.
 */
export function progressNarrative(input: NarrativeInput): ProgressNarrative {
  if (input.sessions === 0) {
    return { headline: 'No typing sessions recorded yet.', points: [] };
  }

  const points: string[] = [];
  const wpmChange = Math.round((input.latestWpm - input.firstWpm) * 10) / 10;
  const accuracyChange = Math.round(input.latestAccuracy - input.firstAccuracy);

  if (input.practiceDays < 2) {
    points.push('Only one practice day so far, so there is no trend to read yet.');
  } else {
    if (wpmChange >= SIGNIFICANT_WPM) points.push(`Speed is up ${wpmChange} WPM since the first practice day.`);
    else if (wpmChange <= -SIGNIFICANT_WPM) points.push(`Speed is down ${Math.abs(wpmChange)} WPM since the first practice day.`);
    else points.push('Speed has stayed about level since the first practice day.');

    if (accuracyChange >= SIGNIFICANT_ACCURACY) points.push(`Accuracy has improved by ${accuracyChange} points.`);
    else if (accuracyChange <= -SIGNIFICANT_ACCURACY) points.push(`Accuracy has slipped by ${Math.abs(accuracyChange)} points.`);
    else points.push(`Accuracy is holding steady around ${Math.round(input.latestAccuracy)}%.`);

    // Needs several practice days and a clear drop; two or three points of
    // accuracy over a handful of days is normal variation, not rushing.
    if (input.practiceDays >= RUSHING_MIN_DAYS && wpmChange >= SIGNIFICANT_WPM && accuracyChange <= -RUSHING_ACCURACY_DROP) {
      points.push('Speed is rising while accuracy falls. Worth checking whether they are rushing.');
    }
  }

  if (input.weakSkillNames.length) {
    const names = input.weakSkillNames.slice(0, 3).join(', ');
    points.push(`Needs reinforcement: ${names}.`);
  } else if (input.masteredCount > 0) {
    points.push(`${input.masteredCount} skill${input.masteredCount === 1 ? '' : 's'} mastered with nothing flagged as weak.`);
  }

  if (input.daysSincePractice !== null && input.daysSincePractice > 7) {
    points.push(`Last practiced ${input.daysSincePractice} days ago.`);
  }

  const headline = input.practiceDays < 2
    ? 'Just getting started.'
    : wpmChange >= SIGNIFICANT_WPM
      ? 'Getting faster.'
      : wpmChange <= -SIGNIFICANT_WPM
        ? 'Speed has dropped.'
        : 'Steady progress.';

  return { headline, points };
}
