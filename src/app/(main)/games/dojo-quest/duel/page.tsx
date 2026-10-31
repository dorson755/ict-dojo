import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/aws/auth-utils';
import { getQuestAccess } from '@/lib/quest-access';
import { QUEST_STAGES } from '@/domains/typing/quest';
import QuestClient from '../QuestClient';
import styles from '../quest.module.css';

export default async function DuelPage() {
  const user = await getUserSession();
  if (!user) redirect('/login');
  if (user.role === 'teacher') redirect('/teacher');
  if (user.role === 'parent') redirect('/parent');
  const access = await getQuestAccess(user.id);
  if (!access.profile?.grade_level) redirect('/onboarding');
  return (
    <div className={styles.page}>
      <Link href="/games/dojo-quest" className={styles.back}>
        Back to Dojo Quest
      </Link>
      <header className={styles.header}>
        <h1>Courtyard sparring</h1>
        <p>
          A friendly typing duel against Crimson. Build your combo, gather focus gems, and land a
          special strike.
        </p>
        <p>
          First playable prototype. Open to every belt, with short words and generous attack
          windows.
        </p>
      </header>
      <QuestClient stage={QUEST_STAGES[0]} studentId={user.id} mode="duel" />
    </div>
  );
}
