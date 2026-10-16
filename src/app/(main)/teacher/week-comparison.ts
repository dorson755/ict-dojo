import { validSessions, type SessionLike } from './progress';

const DAY_MS = 86_400_000;

export interface WeekTotals {
  sessions: number;
  minutes: number;
  /** Mean WPM across valid sessions in the window, or null when there are none. */
  wpm: number | null;
  accuracy: number | null;
  practicedLearners: number;
}

export interface ComparableLearner {
  display_name?: string;
  sessions: SessionLike[];
  /** True when the stored history may stop short of the window, so older sessions are missing. */
  historyTruncated?: boolean;
}

function toTime(value: unknown): number | null {
  if (!value) return null;
  const time = new Date(String(value)).getTime();
  return Number.isNaN(time) ? null : time;
}

/**
 * Sessions in a rolling 7-day window. This week is [now - 7d, now], matching the report's own
 * "within 7 days" rule, so a session exactly 7 days old counts as this week, never as last week.
 * Earlier windows are [end - 7d, end) so no session lands in two weeks.
 */
export function sessionsInWindow<T extends SessionLike>(sessions: T[], now: number, endDaysAgo: number): T[] {
  const end = now - endDaysAgo * DAY_MS;
  const start = end - 7 * DAY_MS;
  return sessions.filter((session) => {
    const time = toTime(session.created_at);
    if (time === null) return false;
    return endDaysAgo === 0 ? time >= start && time <= end : time >= start && time < end;
  });
}

const mean = (values: number[]) => (values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null);

export function weekTotals(learners: ComparableLearner[], now: number, endDaysAgo: number): WeekTotals {
  let sessions = 0;
  let durationMs = 0;
  let practicedLearners = 0;
  const wpm: number[] = [];
  const accuracy: number[] = [];
  for (const learner of learners) {
    const inWindow = sessionsInWindow(learner.sessions, now, endDaysAgo);
    if (inWindow.length > 0) practicedLearners += 1;
    sessions += inWindow.length;
    durationMs += inWindow.reduce((sum, session) => sum + (Number(session.durationMs) || 0), 0);
    for (const session of validSessions(inWindow)) {
      wpm.push(Number(session.wpm));
      const value = Number(session.accuracy);
      if (Number.isFinite(value) && value > 0) accuracy.push(value);
    }
  }
  return { sessions, minutes: Math.round(durationMs / 60_000), wpm: mean(wpm), accuracy: mean(accuracy), practicedLearners };
}

export interface WeekComparison {
  thisWeek: WeekTotals;
  lastWeek: WeekTotals;
  /** False when some learner's history stops inside the comparison window, so last week may be undercounted. */
  reliable: boolean;
}

export function compareWeeks(learners: ComparableLearner[], now: number): WeekComparison {
  return {
    thisWeek: weekTotals(learners, now, 0),
    lastWeek: weekTotals(learners, now, 7),
    reliable: !learners.some((learner) => learner.historyTruncated),
  };
}

/**
 * Stored history is newest first and capped. If the cap was reached and the oldest stored session
 * is still inside the 14-day window, earlier sessions in that window were cut off.
 */
export function isHistoryTruncated(sessions: SessionLike[], limit: number, now: number): boolean {
  if (sessions.length < limit) return false;
  const times = sessions.map((session) => toTime(session.created_at)).filter((time): time is number => time !== null);
  if (times.length === 0) return false;
  return Math.min(...times) > now - 14 * DAY_MS;
}

export interface Improver {
  name: string;
  /** Change in mean WPM, this week minus last week. */
  wpmChange: number;
  thisWpm: number;
  lastWpm: number;
  sessionsThisWeek: number;
}

const MIN_SESSIONS_PER_WEEK = 2;
const MIN_WPM_GAIN = 2;

/**
 * Learners whose mean WPM rose most from last week to this week. Both weeks need a couple of valid
 * sessions so one lucky run does not rank, and a gain under a couple of WPM is noise, not improvement.
 */
export function mostImproved(learners: ComparableLearner[], now: number, limit = 3): Improver[] {
  const results: Improver[] = [];
  for (const learner of learners) {
    if (learner.historyTruncated) continue;
    const thisWeek = validSessions(sessionsInWindow(learner.sessions, now, 0));
    const lastWeek = validSessions(sessionsInWindow(learner.sessions, now, 7));
    if (thisWeek.length < MIN_SESSIONS_PER_WEEK || lastWeek.length < MIN_SESSIONS_PER_WEEK) continue;
    const thisWpm = mean(thisWeek.map((session) => Number(session.wpm)));
    const lastWpm = mean(lastWeek.map((session) => Number(session.wpm)));
    if (thisWpm === null || lastWpm === null) continue;
    const wpmChange = thisWpm - lastWpm;
    if (wpmChange < MIN_WPM_GAIN) continue;
    results.push({
      name: learner.display_name || 'Unnamed learner',
      wpmChange,
      thisWpm,
      lastWpm,
      sessionsThisWeek: thisWeek.length,
    });
  }
  return results.sort((a, b) => b.wpmChange - a.wpmChange || b.thisWpm - a.thisWpm).slice(0, limit);
}
