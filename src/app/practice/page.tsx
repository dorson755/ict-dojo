import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import PracticeClient from './PracticeClient';

export default async function PracticePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 1. Check for active recommendation
  let targetSkillId = null;
  const { data: recommendations } = await (supabase.from('recommendations') as any)
    .select('*')
    .eq('student_id', user.id)
    .eq('is_acted_on', false)
    .order('priority', { ascending: false })
    .limit(1);

  if (recommendations && recommendations.length > 0) {
    targetSkillId = recommendations[0].recommended_skill_id;
    // Mark as acted on
    await (supabase.from('recommendations') as any)
      .update({ is_acted_on: true })
      .eq('id', recommendations[0].id);
  }

  // 2. Fetch an exercise
  let exercise = null;
  
  if (targetSkillId) {
    // Try to find an exercise that targets this skill
    const { data: exercises } = await (supabase.from('exercises') as any)
      .select('*')
      .contains('skill_ids', [targetSkillId])
      .limit(1);
      
    if (exercises && exercises.length > 0) {
      exercise = exercises[0];
    }
  }

  if (!exercise) {
    // Fallback: just grab any exercise suitable for their grade (assume grade 3 if unknown for now)
    const { data: profile } = await (supabase.from('student_profiles') as any)
      .select('grade_level')
      .eq('id', user.id)
      .single();
      
    const grade = profile?.grade_level || 3;

    const { data: fallbackExercises } = await (supabase.from('exercises') as any)
      .select('*')
      .lte('grade_level_min', grade)
      .gte('grade_level_max', grade)
      .limit(1);
      
    if (fallbackExercises && fallbackExercises.length > 0) {
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
