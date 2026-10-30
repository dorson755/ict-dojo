import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getUserSession } from '@/lib/aws/auth-utils';
import { getQuestAccess } from '@/lib/quest-access';
import { canEnterStage, questStage, stageTitle } from '@/domains/typing/quest';
import QuestClient from '../QuestClient';
import styles from '../quest.module.css';

export default async function QuestStagePage({ params }: { params: Promise<{ belt: string }> }) {
  const user = await getUserSession();
  if (!user) redirect('/login');
  if (user.role === 'teacher') redirect('/teacher');
  if (user.role === 'parent') redirect('/parent');
  const { belt } = await params;
  if (!/^[0-7]$/.test(belt)) notFound();
  const stage = questStage(Number(belt))!;
  const access = await getQuestAccess(user.id);
  if (!access.profile?.grade_level) redirect('/onboarding');
  if (!canEnterStage(access.belt, stage.belt)) redirect('/games/dojo-quest');
  return (
    <div className={styles.page}>
      <Link href="/games/dojo-quest" className={styles.back}>
        All stages
      </Link>
      <header className={styles.header}>
        <h1>{stageTitle(stage)}</h1>
        <p>
          Clear {stage.waveSize} creatures, then type {stage.boss}&apos;s scroll to open the gate.
        </p>
      </header>
      <QuestClient stage={stage} studentId={user.id} />
    </div>
  );
}
