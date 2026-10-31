import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/aws/auth-utils';
import { getQuestAccess } from '@/lib/quest-access';
import { canEnterStage, QUEST_STAGES } from '@/domains/typing/quest';
import { getBeltName } from '@/domains/shared/belt-names';
import BeltBadge from '@/components/ui/BeltBadge';
import styles from './quest.module.css';

export default async function QuestPage() {
  const user = await getUserSession();
  if (!user) redirect('/login');
  if (user.role === 'teacher') redirect('/teacher');
  if (user.role === 'parent') redirect('/parent');
  const access = await getQuestAccess(user.id);
  if (!access.profile?.grade_level) redirect('/onboarding');
  return (
    <div className={styles.page}>
      <Link href="/games" className={styles.back}>
        Back to games
      </Link>
      <header className={styles.header}>
        <h1>Dojo Quest</h1>
        <p>Defend the courtyard. Cross the forest. Reach the temple.</p>
        <p>
          Four places, eight belt challenges. Each return brings harder words, picked for the keys
          you need to practise.
        </p>
        <BeltBadge belt={access.belt} size="md" />
      </header>
      <Link href="/games/dojo-quest/duel" className={styles.sparring}>
        <div>
          <h2>Try courtyard sparring</h2>
          <p>
            A new one-on-one typing duel. Accurate words build combos and charge a special strike.
          </p>
        </div>
        <span>Play the prototype</span>
      </Link>
      <div className={styles.stages}>
        {QUEST_STAGES.map((stage) => {
          const unlocked = canEnterStage(access.belt, stage.belt);
          const body = (
            <>
              <BeltBadge belt={stage.belt} size="sm" />
              <h2>{stage.name}</h2>
              <p>
                {stage.minWord}–{stage.maxWord} letter words. {stage.waveSize} creatures and{' '}
                {stage.boss}.
              </p>
              <span>
                {unlocked ? 'Enter stage' : `Locked until ${getBeltName(stage.belt)} belt`}
              </span>
            </>
          );
          return unlocked ? (
            <Link
              key={stage.belt}
              href={`/games/dojo-quest/${stage.belt}`}
              className={`${styles.stage} ${styles[stage.setting]}`}
            >
              {body}
            </Link>
          ) : (
            <section
              key={stage.belt}
              className={`${styles.stage} ${styles.locked}`}
              aria-label={`${getBeltName(stage.belt)} belt stage, locked`}
            >
              {body}
            </section>
          );
        })}
      </div>
      <p className={styles.note}>
        Use a physical keyboard. Stages unlock with your earned belt, including its mastery and exam
        requirements.
      </p>
    </div>
  );
}
