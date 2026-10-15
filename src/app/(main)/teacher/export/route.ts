import { getUserSession } from '@/lib/aws/auth-utils';
import { getTeacherReport } from '../report';
import { learnersToCsv } from '../csv-export';

export async function GET() {
  const user = await getUserSession();
  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) return new Response('Unauthorized', { status: 401 });
  const students = await getTeacherReport(user.id);
  return new Response(learnersToCsv(students), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="ict-dojo-learner-vitals.csv"' } });
}
