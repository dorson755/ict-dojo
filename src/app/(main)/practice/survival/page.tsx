import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/aws/auth-utils';
import { SurvivalRepository } from '@/lib/aws/repositories/survival.repository';
import SurvivalClient from './SurvivalClient';

export default async function SurvivalPage() {
  const user = await getUserSession();
  if (!user) redirect('/login');
  if (user.role === 'teacher') redirect('/teacher');
  if (user.role === 'parent') redirect('/parent');

  const [normalLeaderboard, extremeLeaderboard] = await Promise.all([
    SurvivalRepository.getLeaderboard('normal', 15, 10).catch(() => []),
    SurvivalRepository.getLeaderboard('extreme', 15, 10).catch(() => []),
  ]);

  return (
    <SurvivalClient
      initialLeaderboard={normalLeaderboard}
      initialExtremeLeaderboard={extremeLeaderboard}
    />
  );
}
