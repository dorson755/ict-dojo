'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { TypingSessionResult } from '@/domains/typing/types';
import { MasteryService } from '@/domains/shared/mastery-service';

export async function submitDiagnostic(results: TypingSessionResult[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // Calculate baseline WPM from the results
  const validResults = results.filter(r => r.isValid);
  if (validResults.length === 0) {
    throw new Error('No valid diagnostic results provided.');
  }

  const avgWpm = validResults.reduce((sum, r) => sum + r.wpm, 0) / validResults.length;
  const avgAccuracy = validResults.reduce((sum, r) => sum + r.accuracy, 0) / validResults.length;

  // Set Typing DNA
  await (supabase.from('typing_dna') as any).upsert({
    student_id: user.id,
    baseline_wpm: Math.round(avgWpm),
    avg_accuracy: Math.round(avgAccuracy),
    last_assessed_at: new Date().toISOString()
  }, { onConflict: 'student_id' });

  // Initialize Mastery based on baseline WPM
  // For the MVP, we'll give them an initial score on the home row skills based on WPM.
  const { data: skills } = await (supabase.from('skills') as any)
    .select('*')
    .eq('domain_id', 'a1b2c3d4-0001-0001-0001-000000000001');

  if (skills) {
    const masteryService = new MasteryService();
    const initialScore = Math.min(100, avgWpm); // Very rough heuristic

    for (const skill of skills) {
      // Only seed basic skills if they did okay, otherwise start from scratch
      if (avgWpm > 20 && skill.difficulty_baseline < 30) {
        const initialLevel = masteryService.getMasteryLevelFromScore(initialScore);
        
        await (supabase.from('skill_mastery') as any).upsert({
          student_id: user.id,
          skill_id: skill.id,
          domain_id: skill.domain_id,
          mastery_score: initialScore,
          mastery_level: initialLevel,
          practice_count: 0,
          last_practiced_at: new Date().toISOString()
        }, { onConflict: 'student_id, skill_id' });
      }
    }
  }

  // Generate an initial recommendation
  // We can just rely on the AdaptiveEngine to generate one next time they hit the dashboard/practice,
  // but let's clear any old ones just in case.
  await (supabase.from('recommendations') as any)
    .delete()
    .eq('student_id', user.id);

  revalidatePath('/dashboard');
  revalidatePath('/practice');
  
  return { success: true };
}
