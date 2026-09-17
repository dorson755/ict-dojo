import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/aws/auth-utils';
import { UserRepository } from '@/lib/aws/repositories/user.repository';
import { MasteryRepository } from '@/lib/aws/repositories/mastery.repository';
import { ExerciseRepository } from '@/lib/aws/repositories/exercise.repository';
import BeltExamClient from './BeltExamClient';
import { getBeltName } from '@/components/ui/BeltBadge';
import {
  MAX_BELT,
  countChunksMastered,
  evaluateBeltRequirements,
  getBeltExamTargets,
  getExamSkillIds,
  getMasteryBelt,
  getXpBelt,
} from '@/domains/shared/belt-requirements';
import type { MasteryLevel } from '@/types/platform';
import styles from './belt-exam.module.css';

const LEVEL_LABELS: Record<MasteryLevel, string> = {
  not_started: 'Not started',
  weak: 'Weak',
  developing: 'Developing',
  strong: 'Strong',
  mastered: 'Mastered',
};

export default async function BeltExamPage() {
  const user = await getUserSession();
  if (!user) redirect('/login');
  if (user.role !== 'student') redirect('/dashboard');

  const [profile, allMasteries] = await Promise.all([
    UserRepository.getProfile(user.id),
    MasteryRepository.getAllMastery(user.id).catch(() => []),
  ]);
  if (!profile) redirect('/onboarding');

  const level = profile.platform_level ?? 1;
  const examPassed = profile.belt_exam_passed ?? 0;
  const masteryLevels = Object.fromEntries(
    allMasteries.map((mastery) => [mastery.skill_id, mastery.mastery_level as MasteryLevel])
  ) as Record<string, MasteryLevel>;
  const chunksMastered = countChunksMastered(allMasteries);
  const xpBelt = getXpBelt(level);
  const masteryBelt = getMasteryBelt(masteryLevels, chunksMastered);
  const targetBelt = examPassed + 1;

  if (targetBelt > MAX_BELT) {
    return (
      <main className={styles.page}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>Belt exam</p>
            <h1 className={styles.title}>You hold the highest belt.</h1>
            <p className={styles.subtitle}>Black belt earned. Keep sharpening your skills in the dojo.</p>
          </div>
          <Link className={styles.back} href="/dashboard">← Back to dashboard</Link>
        </header>
      </main>
    );
  }

  const eligible = xpBelt >= targetBelt && masteryBelt >= targetBelt;

  if (!eligible) {
    const checklist = evaluateBeltRequirements(targetBelt, level, masteryLevels, chunksMastered);
    return (
      <main className={styles.page}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>Belt exam / {getBeltName(targetBelt)}</p>
            <h1 className={styles.title}>Not ready yet.</h1>
            <p className={styles.subtitle}>
              The {getBeltName(targetBelt)} belt exam unlocks once you meet every requirement below.
              Keep practicing — your XP keeps counting.
            </p>
          </div>
          <Link className={styles.back} href="/dashboard">← Back to dashboard</Link>
        </header>

        <section className={styles.notice}>
          <h2 className={styles.noticeTitle}>{getBeltName(targetBelt)} belt requirements</h2>
          <ul className={styles.checklist}>
            <li className={checklist.xp.met ? styles.met : styles.unmet}>
              Reach level {checklist.xp.requiredLevel} — you are level {checklist.xp.currentLevel}
            </li>
            {checklist.skills.map((skill) => (
              <li
                key={skill.skillId}
                className={skill.met ? styles.met : styles.unmet}
              >
                {skill.skillId.replace(/^typing-/, '').replace(/-/g, ' ')} —{' '}
                {LEVEL_LABELS[skill.current]}, needs {LEVEL_LABELS[skill.minLevel]}
              </li>
            ))}
            {checklist.chunks.required > 0 && (
              <li className={checklist.chunks.met ? styles.met : styles.unmet}>
                {checklist.chunks.required} chunks mastered — you have {checklist.chunks.current}
              </li>
            )}
            <li className={styles.unmet}>
              Pass the {getBeltName(targetBelt)} belt exam —{' '}
              {getBeltExamTargets(targetBelt).accuracy}% accuracy at {getBeltExamTargets(targetBelt).wpm}+ WPM
            </li>
          </ul>
        </section>
      </main>
    );
  }

  // Eligible: build the exam passage from the belt's required skill exercises.
  const skillIds = getExamSkillIds(targetBelt);
  const domainExercises = await ExerciseRepository.getExercisesByDomain('1');
  const passages = domainExercises
    .map((exercise) => ({
      skillIds: (exercise.skill_ids || []) as string[],
      passage: String(exercise.content?.passage ?? ''),
    }))
    .filter((exercise) => exercise.passage && exercise.skillIds.some((id) => skillIds.includes(id)))
    .map((exercise) => exercise.passage);
  const passage = passages.join(' ').trim();

  if (!passage) {
    return (
      <main className={styles.page}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>Belt exam / {getBeltName(targetBelt)}</p>
            <h1 className={styles.title}>Exam unavailable.</h1>
            <p className={styles.subtitle}>No exercises found for this belt. Please contact your teacher.</p>
          </div>
          <Link className={styles.back} href="/dashboard">← Back to dashboard</Link>
        </header>
      </main>
    );
  }

  return (
    <BeltExamClient
      studentId={user.id}
      belt={targetBelt}
      beltName={getBeltName(targetBelt)}
      passage={passage}
      skillIds={skillIds}
      targets={getBeltExamTargets(targetBelt)}
    />
  );
}
