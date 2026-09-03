'use server';

import { createClient } from '@/lib/supabase/server';
import { TypingEvaluator } from '@/domains/typing/evaluator';
import { MasteryService } from '@/domains/shared/mastery-service';
import { AdaptiveEngine } from '@/domains/shared/adaptive-engine';
import { TypingSessionInput } from '@/domains/typing/types';
import { revalidatePath } from 'next/cache';
import { Skill, SkillDependency, SkillMastery } from '@/types/platform';

/**
 * Evaluates a completed typing session, updates the database (DNA, mastery, history),
 * and generates the next recommendation.
 */
export async function submitTypingSession(input: TypingSessionInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.id !== input.studentId) {
    throw new Error('Unauthorized');
  }

  // 1. Evaluate the session
  const evaluator = new TypingEvaluator();
  const result = evaluator.evaluate(input);

  if (!result.isValid) {
    return { success: false, reason: result.invalidReason, result };
  }

  // 2. Insert Typing Session
  const { data: sessionRecord, error: sessionErr } = await (supabase.from('typing_sessions') as any)
    .insert({
      student_id: user.id,
      exercise_id: input.exerciseId,
      wpm: result.wpm,
      accuracy: result.accuracy,
      chars_attempted: result.charsAttempted,
      chars_correct: result.charsCorrect,
      backspaces: result.backspaces,
      duration_ms: result.durationMs,
      error_locations: result.errorLocations,
      hesitation_events: result.hesitationEvents,
      composite_score: result.compositeScore
    })
    .select('id')
    .single();

  if (sessionErr) throw sessionErr;

  // 3. Update Typing DNA (simplified for MVP: just update aggregates)
  // In a full version, we'd merge keyPairErrors.
  await (supabase.from('typing_dna') as any).upsert({
    student_id: user.id,
    baseline_wpm: result.wpm, // Ideally an average over time
    last_assessed_at: new Date().toISOString()
  }, { onConflict: 'student_id' });

  // 4. Update Mastery for all target skills of this exercise
  const masteryService = new MasteryService();
  
  // Fetch current mastery
  const { data: currentMasteryData } = await (supabase.from('skill_mastery') as any)
    .select('*')
    .eq('student_id', user.id)
    .in('skill_id', input.skillIds);

  const currentMasteryMap = new Map<string, SkillMastery>((currentMasteryData || []).map((m: any) => [m.skill_id, m as SkillMastery]));

  for (const skillId of input.skillIds) {
    const current = currentMasteryMap.get(skillId) as SkillMastery | undefined;
    
    // Process the new attempt
    const masteryUpdate = masteryService.processAttempt(
      current,
      user.id,
      skillId,
      result.compositeScore // Using composite score as the performance metric
    );

    // Upsert into skill_mastery
    await (supabase.from('skill_mastery') as any).upsert({
      student_id: user.id,
      skill_id: skillId,
      domain_id: 'a1b2c3d4-0001-0001-0001-000000000001', // Typing domain UUID (from seed)
      mastery_score: masteryUpdate.newScore,
      mastery_level: masteryUpdate.newLevel,
      practice_count: (current?.practice_count || 0) + 1,
      last_practiced_at: new Date().toISOString()
    }, { onConflict: 'student_id, skill_id' });

    // Insert into mastery_history
    await (supabase.from('mastery_history') as any).insert({
      student_id: user.id,
      skill_id: skillId,
      previous_score: current?.mastery_score || 0,
      new_score: masteryUpdate.newScore,
      assessment_source_id: sessionRecord.id,
      source_type: 'practice'
    });
  }

  // 5. Run AdaptiveEngine to get next recommendation
  // We need to fetch all skills, dependencies, and all student mastery for the domain
  const { data: allSkills } = await (supabase.from('skills') as any).select('*').eq('domain_id', 'a1b2c3d4-0001-0001-0001-000000000001');
  const { data: allDeps } = await (supabase.from('skill_dependencies') as any).select('*');
  const { data: allMastery } = await (supabase.from('skill_mastery') as any).select('*').eq('student_id', user.id);

  const fullMasteryMap = new Map<string, SkillMastery>((allMastery || []).map((m: any) => [m.skill_id, m as SkillMastery]));

  const engine = new AdaptiveEngine();
  const nextRec = engine.getNextRecommendation({
    studentId: user.id,
    domainId: 'a1b2c3d4-0001-0001-0001-000000000001',
    masteryMap: fullMasteryMap,
    skills: (allSkills || []) as Skill[],
    dependencies: (allDeps || []) as SkillDependency[],
    recentAttempts: [] // Omitting for MVP
  });

  if (nextRec) {
    await (supabase.from('recommendations') as any).insert({
      ...nextRec,
      priority: nextRec.priority,
    });
  }

  revalidatePath('/practice');
  revalidatePath('/dashboard');

  return { success: true, result, nextRecommendation: nextRec };
}
