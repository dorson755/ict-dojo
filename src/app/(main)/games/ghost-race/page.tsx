import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/aws/auth-utils';
import { UserRepository } from '@/lib/aws/repositories/user.repository';
import { ProgressRepository } from '@/lib/aws/repositories/progress.repository';
import { ExerciseRepository } from '@/lib/aws/repositories/exercise.repository';
import GhostRaceClient, { type RaceExercise } from './GhostRaceClient';
import styles from '../games.module.css';

interface DomainExercise {
  id: string;
  skill_ids?: string[];
  title?: string;
  difficulty?: number;
  grade_level_min?: number | null;
  grade_level_max?: number | null;
  content?: { passage?: string };
}

/** Races stay short: about two minutes for most learners. */
function trimPassage(passage: string, max = 280): string {
  if (passage.length <= max) return passage;
  const cut = passage.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut).trim();
}

export default async function GhostRacePage() {
  const user = await getUserSession();
  if (!user) redirect('/login');
  if (user.role === 'teacher') redirect('/teacher');
  if (user.role === 'parent') redirect('/parent');

  const [profile, records, exercises] = await Promise.all([
    UserRepository.getProfile(user.id).catch(() => null),
    ProgressRepository.getPersonalRecords(user.id).catch(() => []),
    ExerciseRepository.getExercisesByDomain('1').catch(() => [] as DomainExercise[]),
  ]);

  const grade = profile?.grade_level || 6;
  const typed = (exercises as DomainExercise[]).filter((exercise) => exercise.content?.passage);
  const gradeAppropriate = typed.filter(
    (exercise) =>
      (exercise.grade_level_min ?? 1) <= grade && (exercise.grade_level_max ?? 12) >= grade
  );
  const chosen = gradeAppropriate[0] ?? typed[0];

  if (!chosen) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <p className={styles.kicker}>Games / ghost race</p>
          <h1 className={styles.title}>Ghost Race</h1>
        </header>
        <p className={styles.subtitle}>No practice passages are available yet. Ask your teacher to seed exercises.</p>
      </div>
    );
  }

  const bestWpm = records.find((record) => record.metric === 'best_wpm')?.value ?? null;
  const ghostWpm = bestWpm && bestWpm > 0 ? Math.max(1, Math.round(bestWpm)) : 20;

  const exercise: RaceExercise = {
    id: String(chosen.id),
    title: chosen.title ?? 'Practice passage',
    difficulty: chosen.difficulty ?? 1,
    skillIds: (chosen.skill_ids ?? []) as string[],
    passage: trimPassage(String(chosen.content?.passage)),
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Games / ghost race</p>
        <h1 className={styles.title}>Ghost Race</h1>
        <p className={styles.subtitle}>
          {bestWpm && bestWpm > 0
            ? `A ghost paces at your all-time best speed (${ghostWpm} WPM). Type the passage and finish first.`
            : 'No record yet, so the ghost paces at 20 WPM. Set a record and it will race at your best.'}
        </p>
      </header>
      <GhostRaceClient studentId={user.id} exercise={exercise} ghostWpm={ghostWpm} />
    </div>
  );
}
