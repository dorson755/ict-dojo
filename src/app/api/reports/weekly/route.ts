import { checkReportSecret } from '@/lib/report-auth';
import { getTeacherReport } from '@/app/(main)/teacher/report';
import { buildWeeklyEmail } from '@/app/(main)/teacher/weekly-email';
import { sendRawEmail } from '@/lib/aws/ses';
import { parseRecipients } from '@/lib/recipients';

export const dynamic = 'force-dynamic';

// No learner is a teacher, so this id excludes nobody and yields the whole roster.
const ALL_LEARNERS = 'weekly-report';

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const auth = checkReportSecret(process.env.WEEKLY_REPORT_SECRET, request.headers.get('authorization'));
  if (auth === 'not_configured') return json({ error: 'Weekly report is not configured' }, 503);
  if (auth === 'unauthorized') return json({ error: 'Unauthorized' }, 401);

  const recipients = parseRecipients(process.env.WEEKLY_REPORT_TO);
  const sender = process.env.WEEKLY_REPORT_FROM;
  if (!recipients || !sender) {
    return json({ error: 'WEEKLY_REPORT_TO (comma-separated addresses) and WEEKLY_REPORT_FROM must be set' }, 503);
  }

  const dryRun = new URL(request.url).searchParams.get('dryRun') === '1';

  try {
    const students = await getTeacherReport(ALL_LEARNERS);
    const email = buildWeeklyEmail(students, new Date());

    if (dryRun) {
      return json({ dryRun: true, to: recipients, subject: email.subject, learners: students.length, preview: email.text }, 200);
    }

    const messageId = await sendRawEmail({
      from: `ICT Dojo <${sender}>`,
      to: recipients,
      subject: email.subject,
      text: email.text,
      html: email.html,
      attachment: { filename: email.csvFilename, contentType: 'text/csv; charset=utf-8', content: email.csv },
    });
    return json({ sent: true, to: recipients, subject: email.subject, learners: students.length, messageId }, 200);
  } catch (error) {
    // The scheduler only needs to know it failed; details stay in the server log.
    console.error('Weekly report failed:', error);
    return json({ error: 'Weekly report failed' }, 500);
  }
}
