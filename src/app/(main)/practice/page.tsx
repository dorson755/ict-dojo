import { redirect } from 'next/navigation';
import PracticeClient, { type PracticeExercise } from './PracticeClient';
import { getUserSession } from '@/lib/firebase/auth-utils';
import { RecommendationRepository } from '@/lib/firebase/repositories/recommendation.repository';
import { ExerciseRepository } from '@/lib/firebase/repositories/exercise.repository';
import { UserRepository } from '@/lib/firebase/repositories/user.repository';
import { AdaptiveGenerator } from '@/domains/typing/generators/AdaptiveGenerator';
import styles from './practice.module.css';

export default async function PracticePage() {
  const user = await getUserSession();

  if (!user) {
    redirect('/login');
  }

  let targetSkillId = null;
  const activeRec = await RecommendationRepository.getActiveRecommendation(user.id);

  if (activeRec) {
    targetSkillId = activeRec.skill_id;
  }

  let exercise: PracticeExercise | null = null;

  if ((activeRec as any)?.recommended_exercise_id === 'ADAPTIVE_WEAKNESS_DRILL') {
    const dna = await UserRepository.getTypingDNA(user.id);
    const weakKeys = dna?.weak_keys || {};
    const passage = await AdaptiveGenerator.generatePassage(weakKeys, 20);

    exercise = {
      id: 'adaptive-drill-1',
      domain_id: '1',
      skill_ids: [],
      title: 'Adaptive Weakness Drill',
      difficulty: 1,
      difficulty_metadata: {},
      content: {
        passage,
        hint: 'This drill was custom-generated to target characters you recently struggled with.',
      },
      is_ai_generated: true,
      grade_level_min: 1,
      grade_level_max: 12,
      created_at: new Date().toISOString(),
    };
  } else if (targetSkillId) {
    const domainExercises = await ExerciseRepository.getExercisesByDomain('1');
    exercise = (domainExercises as PracticeExercise[]).find((e) => (e.skill_ids || []).includes(targetSkillId)) ?? null;
  }

  if (!exercise) {
    const profile = await UserRepository.getProfile(user.id);
    const grade = profile?.grade_level || 3;

    const domainExercises = await ExerciseRepository.getExercisesByDomain('1');
    const fallbackExercises = (domainExercises as PracticeExercise[]).filter(
      (e) => (e.grade_level_min || 1) <= grade && (e.grade_level_max || 12) >= grade
    );

    if (fallbackExercises.length > 0) {
      exercise = fallbackExercises[0];
    }
  }

  if (!exercise) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <h2>No exercises found</h2>
          <p>Please check the database seeds.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Practice dojo</h1>
        <p className={styles.pageSubtitle}>Skill focus: {exercise.title}</p>
      </div>

      <PracticeClient studentId={user.id} exercise={exercise} />
    </div>
  );
}
