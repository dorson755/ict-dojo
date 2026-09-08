import { redirect } from 'next/navigation';
import PracticeClient from './PracticeClient';
import { getUserSession } from '@/lib/aws/auth-utils';
import { RecommendationRepository } from '@/lib/aws/repositories/recommendation.repository';
import { ExerciseRepository } from '@/lib/aws/repositories/exercise.repository';
import { UserRepository } from '@/lib/aws/repositories/user.repository';

export default async function PracticePage() {
  const user = await getUserSession();

  if (!user) {
    redirect('/login');
  }

  // 1. Check for active recommendation
  let targetSkillId = null;
  const activeRec = await RecommendationRepository.getActiveRecommendation(user.id);

  if (activeRec) {
    targetSkillId = activeRec.recommended_skill_id;
    // Note: We don't mark as acted on here anymore, we do it in actions.ts after they submit the session.
    // That way if they refresh or leave, they don't lose the recommendation.
  }

  // 2. Fetch an exercise
  let exercise = null;
  
  if (targetSkillId) {
    // In DynamoDB, we fetch exercises for a domain and filter by skill.
    // For now, fetch by domain '1' (Typing) and filter in memory.
    const domainExercises = await ExerciseRepository.getExercisesByDomain('1');
    exercise = domainExercises.find(e => (e.skill_ids || []).includes(targetSkillId));
  }

  if (!exercise) {
    // Fallback: just grab any exercise suitable for their grade
    const profile = await UserRepository.getProfile(user.id);
    const grade = profile?.grade_level || 3;

    const domainExercises = await ExerciseRepository.getExercisesByDomain('1');
    const fallbackExercises = domainExercises.filter(e => 
      (e.grade_level_min || 1) <= grade && (e.grade_level_max || 12) >= grade
    );
      
    if (fallbackExercises.length > 0) {
      exercise = fallbackExercises[0];
    }
  }

  if (!exercise) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>No exercises found.</h2>
        <p>Please check the database seeds.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>Practice Dojo</h1>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>
        Skill Focus: {exercise.title}
      </p>
      
      <PracticeClient 
        studentId={user.id}
        exercise={exercise}
      />
    </div>
  );
}
