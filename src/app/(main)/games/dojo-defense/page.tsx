import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/aws/auth-utils';
import { getQuestAccess } from '@/lib/quest-access';
import { QUEST_STAGES } from '@/domains/typing/quest';
import DefenseClient from './DefenseClient';
import styles from './defense.module.css';

export default async function DefensePage() {
  const user = await getUserSession();
  if (!user) redirect('/login');
  if (user.role === 'teacher') redirect('/teacher');
  if (user.role === 'parent') redirect('/parent');
  const access = await getQuestAccess(user.id);
  if (!access.profile?.grade_level) redirect('/onboarding');
  return (
    <div className={styles.page}>
      <Link href="/games">Back to games</Link>
      <header className={styles.header}>
        <h1>Dojo Defense</h1>
        <p>Mochi strikes. Miso shields. Your typing keeps the dojo safe.</p>
      </header>
      <DefenseClient stage={QUEST_STAGES[access.belt]} studentId={user.id} />
    </div>
  );
}
