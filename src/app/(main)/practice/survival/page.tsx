import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/aws/auth-utils';
import { SurvivalRepository } from '@/lib/aws/repositories/survival.repository';
import SurvivalClient from './SurvivalClient';

export default async function SurvivalPage() {
  const user = await getUserSession();
  if (!user) redirect('/login');
  if (user.role === 'teacher') redirect('/teacher');
  if (user.role === 'parent') redirect('/parent');

  const initialLeaderboard = await SurvivalRepository.getLeaderboard(15, 10);

  return <SurvivalClient initialLeaderboard={initialLeaderboard} />;
}
