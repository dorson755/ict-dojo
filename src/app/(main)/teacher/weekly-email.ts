import { learnersToCsv, type CsvLearner } from './csv-export';
import { STATUS_LABEL } from './learner-status';
import { emailVisualsHtml, escapeHtml } from './email-visuals';

export interface EmailLearner extends CsvLearner {
  hasStarted: boolean;
  needsAttention: boolean;
}

export interface WeeklyEmail {
  subject: string;
  text: string;
  html: string;
  csv: string;
  csvFilename: string;
}

function name(student: EmailLearner): string {
  return student.display_name || 'Unnamed learner';
}

/** Fixed offset so a label such as "Oct 16" matches the schedule's GMT-5 clock. */
export function weekLabel(now: Date, utcOffsetHours = -5): string {
  const shifted = new Date(now.getTime() + utcOffsetHours * 3_600_000);
  return shifted.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export function buildWeeklyEmail(students: EmailLearner[], now: Date): WeeklyEmail {
  const started = students.filter((student) => student.hasStarted);
  const active = students.filter((student) => student.sessionsThisWeek > 0);
  const sessions = students.reduce((sum, student) => sum + student.sessionsThisWeek, 0);
  const minutes = students.reduce((sum, student) => sum + student.minutesThisWeek, 0);
  const attention = students.filter((student) => student.needsAttention);
  const examReady = students.filter((student) => student.belt.examReady);
  const quiet = started.filter((student) => student.sessionsThisWeek === 0 && !student.needsAttention);
  const date = weekLabel(now);

  const headline = [
    `${active.length} of ${students.length} learners practiced this week`,
    `${sessions} session${sessions === 1 ? '' : 's'}, ${minutes} minute${minutes === 1 ? '' : 's'}`,
  ];

  const lists: Array<{ title: string; items: string[] }> = [
    {
      title: 'Needs attention',
      items: attention.map((student) => `${name(student)}: ${student.reason}`),
    },
    {
      title: 'Ready for a belt exam',
      items: examReady.map((student) => name(student)),
    },
    {
      title: 'Did not practice this week',
      items: quiet.map((student) => name(student)),
    },
  ].filter((list) => list.items.length > 0);

  const statusCounts = (['needs_reinforcement', 'inactive', 'on_track', 'not_started'] as const)
    .map((status) => `${STATUS_LABEL[status]}: ${students.filter((student) => student.status === status).length}`);

  const text = [
    `ICT Dojo weekly report, ${date}`,
    '',
    ...headline,
    statusCounts.join(' | '),
    ...lists.flatMap((list) => ['', `${list.title} (${list.items.length})`, ...list.items.map((item) => `- ${item}`)]),
    '',
    'The full learner table is attached as a CSV file.',
  ].join('\n');

  const html = `<!doctype html>
<html lang="en"><body style="margin:0;padding:24px;background:#f5f6f8;font-family:Arial,Helvetica,sans-serif;color:#1c2024;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e1e4e8;border-radius:8px;padding:24px;">
<h1 style="margin:0 0 4px;font-size:20px;">ICT Dojo weekly report</h1>
<p style="margin:0 0 16px;color:#5b636b;font-size:14px;">${escapeHtml(date)}</p>
<p style="margin:0 0 4px;font-size:16px;font-weight:bold;">${escapeHtml(headline[0])}</p>
<p style="margin:0 0 12px;font-size:14px;">${escapeHtml(headline[1])}</p>
${emailVisualsHtml(students)}
${lists.map((list) => `<h2 style="margin:20px 0 6px;font-size:15px;">${escapeHtml(list.title)} (${list.items.length})</h2>
<ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.6;">${list.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`).join('\n')}
<p style="margin:24px 0 0;font-size:13px;color:#5b636b;">The full learner table is attached as a CSV file.</p>
</div></body></html>`;

  return {
    subject: `ICT Dojo weekly report: ${active.length} of ${students.length} learners practiced (${date})`,
    text,
    html,
    csv: learnersToCsv(students),
    csvFilename: `ict-dojo-weekly-${new Date(now.getTime() - 5 * 3_600_000).toISOString().slice(0, 10)}.csv`,
  };
}
