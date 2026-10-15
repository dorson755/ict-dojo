import { getBeltName } from '@/domains/shared/belt-names';
import { beltDistribution } from './belt-status';
import { STATUS_LABEL, type LearnerStatus } from './learner-status';

// Email clients strip inline SVG, <style> blocks and scripts, and block remote images by default.
// Every visual here is a nested table with inline styles, which renders in Gmail, Outlook and Apple Mail.

export interface VisualLearner {
  display_name?: string;
  status: LearnerStatus;
  minutesThisWeek: number;
  sessionsThisWeek: number;
  averageWpm: number;
  averageAccuracy: number;
  wpmTrend: number;
  accuracyTrend: number;
  hasStarted: boolean;
  belt: { belt: number; blockers: string[]; examReady: boolean; nextBelt: number | null };
}

const FONT = 'font-family:Arial,Helvetica,sans-serif;';

const STATUS_ORDER: LearnerStatus[] = ['on_track', 'needs_reinforcement', 'inactive', 'not_started'];
const STATUS_COLOR: Record<LearnerStatus, string> = {
  on_track: '#2f7a58',
  needs_reinforcement: '#b4403a',
  inactive: '#c9a227',
  not_started: '#aab2ba',
};

const BELT_COLOR = ['#e8e8ec', '#f5cc2e', '#f08c3a', '#4caf50', '#4a90d9', '#9b59b6', '#8b6f47', '#16181d'];
// Dark text on light belts, white text on dark ones, so the count stays readable.
const BELT_TEXT = ['#1c2024', '#1c2024', '#1c2024', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'];

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function learnerName(learner: VisualLearner): string {
  return learner.display_name || 'Unnamed learner';
}

function heading(title: string): string {
  return `<h2 style="margin:24px 0 8px;font-size:15px;${FONT}color:#1c2024;">${escapeHtml(title)}</h2>`;
}

export interface StatusSegment {
  status: LearnerStatus;
  count: number;
  percent: number;
}

/** Counts per status in a fixed order. Percentages are whole numbers that sum to 100 when there is anyone. */
export function statusSegments(learners: Array<{ status: LearnerStatus }>): StatusSegment[] {
  const total = learners.length;
  const raw = STATUS_ORDER.map((status) => ({
    status,
    count: learners.filter((learner) => learner.status === status).length,
  }));
  if (total === 0) return raw.map((segment) => ({ ...segment, percent: 0 }));

  const floors = raw.map((segment) => Math.floor((segment.count / total) * 100));
  let leftover = 100 - floors.reduce((sum, value) => sum + value, 0);
  const byRemainder = raw
    .map((segment, index) => ({ index, remainder: (segment.count / total) * 100 - floors[index] }))
    .sort((a, b) => b.remainder - a.remainder);
  for (const { index } of byRemainder) {
    if (leftover <= 0) break;
    if (raw[index].count > 0) {
      floors[index] += 1;
      leftover -= 1;
    }
  }
  return raw.map((segment, index) => ({ ...segment, percent: floors[index] }));
}

/** One stacked bar for the whole class, with a legend that carries the counts. */
export function statusBarHtml(learners: VisualLearner[]): string {
  if (learners.length === 0) return '';
  const segments = statusSegments(learners).filter((segment) => segment.count > 0);
  const cells = segments
    .map((segment) => `<td width="${segment.percent}%" style="width:${segment.percent}%;height:18px;background:${STATUS_COLOR[segment.status]};font-size:1px;line-height:1px;">&nbsp;</td>`)
    .join('');
  const legend = statusSegments(learners)
    .map((segment) => `<span style="display:inline-block;margin:0 14px 4px 0;white-space:nowrap;"><span style="display:inline-block;width:10px;height:10px;background:${STATUS_COLOR[segment.status]};margin-right:5px;"></span>${escapeHtml(STATUS_LABEL[segment.status])} ${segment.count}</span>`)
    .join('');
  return `${heading('Class health')}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-radius:4px;overflow:hidden;"><tr>${cells}</tr></table>
<div style="margin-top:8px;font-size:13px;color:#3d444b;${FONT}">${legend}</div>`;
}

/** Learners per belt as a row of belt-colored cells, plus how many are stuck on XP versus skills. */
export function beltLadderHtml(learners: VisualLearner[]): string {
  if (learners.length === 0) return '';
  const counts = beltDistribution(learners.map((learner) => learner.belt.belt));
  const cells = counts
    .map(({ belt, count }) => `<td align="center" style="padding:0 2px;width:${Math.floor(100 / counts.length)}%;">
<div style="background:${BELT_COLOR[belt]};color:${BELT_TEXT[belt]};border:1px solid #cfd4d9;border-radius:4px;padding:8px 0;font-size:18px;font-weight:bold;${FONT}${count === 0 ? 'opacity:0.45;' : ''}">${count}</div>
<div style="margin-top:4px;font-size:11px;color:#5b636b;${FONT}">${escapeHtml(getBeltName(belt))}</div></td>`)
    .join('');

  const climbing = learners.filter((learner) => learner.belt.nextBelt !== null);
  const heldByXp = climbing.filter((learner) => learner.belt.blockers.includes('xp')).length;
  const heldBySkills = climbing.filter((learner) => learner.belt.blockers.includes('skills')).length;
  const ready = climbing.filter((learner) => learner.belt.examReady).length;
  const note = `Held back by XP: ${heldByXp}  ·  Held back by skills: ${heldBySkills}  ·  Exam ready: ${ready}`;

  return `${heading('Belt ranks')}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>${cells}</tr></table>
<div style="margin-top:8px;font-size:12px;color:#5b636b;${FONT}">${escapeHtml(note)}</div>`;
}

export interface ActivityBar {
  name: string;
  minutes: number;
  sessions: number;
  percent: number;
}

/** Most active learners first. Bars scale to the busiest learner so small weeks still show a difference. */
export function activityBars(learners: VisualLearner[], limit = 10): ActivityBar[] {
  const sorted = [...learners]
    .sort((a, b) => b.minutesThisWeek - a.minutesThisWeek || b.sessionsThisWeek - a.sessionsThisWeek)
    .slice(0, limit);
  const max = Math.max(0, ...sorted.map((learner) => learner.minutesThisWeek));
  return sorted.map((learner) => ({
    name: learnerName(learner),
    minutes: learner.minutesThisWeek,
    sessions: learner.sessionsThisWeek,
    percent: learner.minutesThisWeek <= 0 ? 0 : Math.max(2, Math.round((learner.minutesThisWeek / max) * 100)),
  }));
}

/** Practice minutes per learner this week. Says so plainly when nobody practiced. */
export function activityBarsHtml(learners: VisualLearner[]): string {
  if (learners.length === 0) return '';
  if (learners.every((learner) => learner.minutesThisWeek === 0)) {
    return `${heading('Practice minutes this week')}
<p style="margin:0;font-size:13px;color:#5b636b;${FONT}">No practice recorded this week.</p>`;
  }
  const rows = activityBars(learners)
    .map((bar) => `<tr>
<td style="width:34%;padding:3px 8px 3px 0;font-size:13px;color:#1c2024;${FONT}white-space:nowrap;overflow:hidden;">${escapeHtml(bar.name)}</td>
<td style="padding:3px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#eef0f2;"><tr>${bar.percent > 0 ? `<td width="${bar.percent}%" style="width:${bar.percent}%;height:14px;background:#1f5f66;font-size:1px;line-height:1px;">&nbsp;</td>` : ''}<td style="height:14px;font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td>
<td style="width:64px;padding:3px 0 3px 8px;font-size:12px;color:#3d444b;text-align:right;${FONT}white-space:nowrap;">${bar.minutes} min</td></tr>`)
    .join('\n');
  return `${heading('Practice minutes this week')}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows}</table>`;
}

export interface ClassAverages {
  wpm: number | null;
  accuracy: number | null;
  wpmTrend: number | null;
  accuracyTrend: number | null;
}

/** Averages over learners who have a measurement. Trends average only learners who also have a nonzero reading. */
export function classAverages(learners: VisualLearner[]): ClassAverages {
  const mean = (values: number[]) => (values.length === 0 ? null : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length));
  const measured = learners.filter((learner) => learner.hasStarted);
  return {
    wpm: mean(measured.filter((learner) => learner.averageWpm > 0).map((learner) => learner.averageWpm)),
    accuracy: mean(measured.filter((learner) => learner.averageAccuracy > 0).map((learner) => learner.averageAccuracy)),
    wpmTrend: mean(measured.filter((learner) => learner.wpmTrend !== 0).map((learner) => learner.wpmTrend)),
    accuracyTrend: mean(measured.filter((learner) => learner.accuracyTrend !== 0).map((learner) => learner.accuracyTrend)),
  };
}

function trendHtml(change: number | null, unit: string): string {
  if (change === null || change === 0) return `<span style="color:#5b636b;">steady</span>`;
  const up = change > 0;
  return `<span style="color:${up ? '#2f7a58' : '#b4403a'};font-weight:bold;">${up ? '&#9650;' : '&#9660;'} ${Math.abs(change)}${escapeHtml(unit)}</span>`;
}

function tile(label: string, value: string, trend: string): string {
  return `<td width="50%" valign="top" style="width:50%;padding:0 4px;"><div style="border:1px solid #e1e4e8;border-radius:6px;padding:12px;min-height:76px;${FONT}">
<div style="font-size:12px;color:#5b636b;">${escapeHtml(label)}</div>
<div style="font-size:26px;font-weight:bold;color:#1c2024;margin:2px 0;">${value}</div>
<div style="font-size:12px;">${trend}</div></div></td>`;
}

/** Class average speed and accuracy with a colored change arrow. */
export function speedAccuracyHtml(learners: VisualLearner[]): string {
  const averages = classAverages(learners);
  if (averages.wpm === null && averages.accuracy === null) return '';
  return `${heading('Class speed and accuracy')}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;table-layout:fixed;"><tr>
${tile('Average speed', averages.wpm === null ? 'n/a' : `${averages.wpm} <span style="font-size:13px;font-weight:normal;">WPM</span>`, trendHtml(averages.wpmTrend, ' WPM, recent vs earlier sessions'))}
${tile('Average accuracy', averages.accuracy === null ? 'n/a' : `${averages.accuracy}%`, trendHtml(averages.accuracyTrend, ' pts, recent vs earlier sessions'))}
</tr></table>`;
}

/** All visual blocks for the email body, in reading order. Empty string for an empty roster. */
export function emailVisualsHtml(learners: VisualLearner[]): string {
  return [statusBarHtml(learners), speedAccuracyHtml(learners), activityBarsHtml(learners), beltLadderHtml(learners)]
    .filter(Boolean)
    .join('\n');
}
