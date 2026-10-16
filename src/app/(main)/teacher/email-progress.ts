import { escapeHtml } from './email-visuals';
import { compareWeeks, mostImproved, type ComparableLearner, type Improver, type WeekComparison } from './week-comparison';

const FONT = 'font-family:Arial,Helvetica,sans-serif;';

function heading(title: string): string {
  return `<h2 style="margin:24px 0 8px;font-size:15px;${FONT}color:#1c2024;">${escapeHtml(title)}</h2>`;
}

export interface Delta {
  /** Signed change, or null when either side has no value to compare. */
  change: number | null;
  direction: 'up' | 'down' | 'flat' | 'none';
}

export function delta(thisValue: number | null, lastValue: number | null): Delta {
  if (thisValue === null || lastValue === null) return { change: null, direction: 'none' };
  const change = thisValue - lastValue;
  return { change, direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat' };
}

function deltaText(value: Delta, unit: string): string {
  if (value.direction === 'none') return 'no comparison';
  if (value.direction === 'flat') return 'no change';
  const sign = value.change! > 0 ? '+' : '-';
  return `${sign}${Math.abs(value.change!)}${unit}`;
}

function deltaHtml(value: Delta, unit: string): string {
  if (value.direction === 'none') return '<span style="color:#5b636b;">n/a</span>';
  if (value.direction === 'flat') return '<span style="color:#5b636b;">no change</span>';
  const up = value.direction === 'up';
  return `<span style="color:${up ? '#2f7a58' : '#b4403a'};font-weight:bold;">${up ? '&#9650;' : '&#9660;'} ${Math.abs(value.change!)}${escapeHtml(unit)}</span>`;
}

interface Row {
  label: string;
  thisWeek: string;
  lastWeek: string;
  delta: Delta;
  unit: string;
}

function rows(comparison: WeekComparison): Row[] {
  const { thisWeek, lastWeek } = comparison;
  const show = (value: number | null, suffix = '') => (value === null ? 'n/a' : `${value}${suffix}`);
  return [
    { label: 'Learners practicing', thisWeek: String(thisWeek.practicedLearners), lastWeek: String(lastWeek.practicedLearners), delta: delta(thisWeek.practicedLearners, lastWeek.practicedLearners), unit: '' },
    { label: 'Sessions', thisWeek: String(thisWeek.sessions), lastWeek: String(lastWeek.sessions), delta: delta(thisWeek.sessions, lastWeek.sessions), unit: '' },
    { label: 'Minutes', thisWeek: String(thisWeek.minutes), lastWeek: String(lastWeek.minutes), delta: delta(thisWeek.minutes, lastWeek.minutes), unit: '' },
    { label: 'Average speed (WPM)', thisWeek: show(thisWeek.wpm), lastWeek: show(lastWeek.wpm), delta: delta(thisWeek.wpm, lastWeek.wpm), unit: '' },
    { label: 'Average accuracy', thisWeek: show(thisWeek.accuracy, '%'), lastWeek: show(lastWeek.accuracy, '%'), delta: delta(thisWeek.accuracy, lastWeek.accuracy), unit: ' pts' },
  ];
}

const NOTE_UNRELIABLE = 'Some learners have more practice history than we keep, so last week may be undercounted.';

/** True when there is nothing to compare, so the block would only show zeros against zeros. */
function isEmpty(comparison: WeekComparison): boolean {
  const { thisWeek, lastWeek } = comparison;
  return thisWeek.sessions === 0 && lastWeek.sessions === 0;
}

export function weekComparisonHtml(comparison: WeekComparison): string {
  if (isEmpty(comparison)) return '';
  const body = rows(comparison)
    .map((row) => `<tr>
<td style="padding:6px 8px 6px 0;font-size:13px;color:#1c2024;${FONT}border-bottom:1px solid #eef0f2;">${escapeHtml(row.label)}</td>
<td align="right" style="padding:6px 8px;font-size:13px;font-weight:bold;color:#1c2024;${FONT}border-bottom:1px solid #eef0f2;">${escapeHtml(row.thisWeek)}</td>
<td align="right" style="padding:6px 8px;font-size:13px;color:#5b636b;${FONT}border-bottom:1px solid #eef0f2;">${escapeHtml(row.lastWeek)}</td>
<td align="right" style="padding:6px 0 6px 8px;font-size:12px;${FONT}border-bottom:1px solid #eef0f2;white-space:nowrap;">${deltaHtml(row.delta, row.unit)}</td></tr>`)
    .join('\n');
  return `${heading('This week vs last week')}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
<tr>
<td style="padding:0 8px 4px 0;font-size:11px;color:#5b636b;${FONT}"></td>
<td align="right" style="padding:0 8px 4px;font-size:11px;color:#5b636b;${FONT}">This week</td>
<td align="right" style="padding:0 8px 4px;font-size:11px;color:#5b636b;${FONT}">Last week</td>
<td align="right" style="padding:0 0 4px 8px;font-size:11px;color:#5b636b;${FONT}">Change</td></tr>
${body}
</table>${comparison.reliable ? '' : `\n<div style="margin-top:6px;font-size:12px;color:#5b636b;${FONT}">${escapeHtml(NOTE_UNRELIABLE)}</div>`}`;
}

export function weekComparisonText(comparison: WeekComparison): string[] {
  if (isEmpty(comparison)) return [];
  return [
    '',
    'This week vs last week',
    ...rows(comparison).map((row) => `- ${row.label}: ${row.thisWeek} (last week ${row.lastWeek}, ${deltaText(row.delta, row.unit)})`),
    ...(comparison.reliable ? [] : [NOTE_UNRELIABLE]),
  ];
}

export function mostImprovedHtml(improvers: Improver[]): string {
  if (improvers.length === 0) return '';
  const items = improvers
    .map((item) => `<tr>
<td style="padding:6px 8px 6px 0;font-size:14px;color:#1c2024;${FONT}border-bottom:1px solid #eef0f2;">${escapeHtml(item.name)}</td>
<td align="right" style="padding:6px 8px;font-size:13px;color:#5b636b;${FONT}border-bottom:1px solid #eef0f2;white-space:nowrap;">${item.lastWpm} &rarr; ${item.thisWpm} WPM</td>
<td align="right" style="padding:6px 0 6px 8px;font-size:13px;font-weight:bold;color:#2f7a58;${FONT}border-bottom:1px solid #eef0f2;white-space:nowrap;">&#9650; ${item.wpmChange}</td></tr>`)
    .join('\n');
  return `${heading('Most improved')}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${items}</table>
<div style="margin-top:6px;font-size:12px;color:#5b636b;${FONT}">Average speed this week vs last week, for learners with at least two sessions in each.</div>`;
}

export function mostImprovedText(improvers: Improver[]): string[] {
  if (improvers.length === 0) return [];
  return [
    '',
    `Most improved (${improvers.length})`,
    ...improvers.map((item) => `- ${item.name}: ${item.lastWpm} to ${item.thisWpm} WPM (+${item.wpmChange})`),
  ];
}

export interface ProgressBlocks {
  html: string;
  text: string[];
}

/** Week-over-week table and most-improved list, built from each learner's stored sessions. */
export function progressBlocks(learners: ComparableLearner[], now: number): ProgressBlocks {
  const comparison = compareWeeks(learners, now);
  const improvers = mostImproved(learners, now);
  return {
    html: [weekComparisonHtml(comparison), mostImprovedHtml(improvers)].filter(Boolean).join('\n'),
    text: [...weekComparisonText(comparison), ...mostImprovedText(improvers)],
  };
}
