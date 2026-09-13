import { getUserSession } from '@/lib/aws/auth-utils';
import { getTeacherReport } from '../report';

function csv(value: unknown) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export async function GET() {
  const user = await getUserSession();
  if (!user || user.role !== 'teacher') return new Response('Unauthorized', { status: 401 });
  const students = await getTeacherReport(user.id);
  const headers = ['Learner', 'Grade', 'Level', 'Sessions this week', 'Minutes this week', 'Average WPM', 'Average accuracy', 'WPM trend', 'Accuracy trend', 'Average mastery', 'Weak skills', 'Streak', 'Last practice', 'Signal'];
  const rows = students.map((student) => [
    student.display_name || 'Learner', student.grade_level || '', student.platform_level || 1,
    student.sessionsThisWeek, student.minutesThisWeek, student.averageWpm || '', student.averageAccuracy || '',
    student.wpmTrend, student.accuracyTrend, student.averageMastery, student.weakSkills,
    student.streak_count || 0, student.lastPractice?.toISOString() || '', student.reason,
  ]);
  const body = [headers, ...rows].map((row) => row.map(csv).join(',')).join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="ict-dojo-learner-vitals.csv"' } });
}
