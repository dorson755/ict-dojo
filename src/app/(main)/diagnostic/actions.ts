'use server';

import { getUserSession } from '@/lib/aws/auth-utils';
import { UserRepository } from '@/lib/aws/repositories/user.repository';
import { MasteryRepository } from '@/lib/aws/repositories/mastery.repository';
import { TypingSessionResult } from '@/domains/typing/types';

function calculateMasteryFromDiagnostic(wpm: number, accuracy: number, skills: any[]) {
  return skills.map(s => ({
    skillId: s.id,
    score: (accuracy * 0.5) + (Math.min(wpm / 40, 1) * 50),
    level: wpm > 30 ? 'mastered' : wpm > 15 ? 'practicing' : 'novice'
  }));
}

export async function submitDiagnostic(results: TypingSessionResult[]) {
  const user = await getUserSession();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Aggregate results
  const validResults = results.filter(r => r.wpm > 0);
  if (validResults.length === 0) return;

  const avgWpm = validResults.reduce((sum, r) => sum + r.wpm, 0) / validResults.length;
  const avgAccuracy = validResults.reduce((sum, r) => sum + r.accuracy, 0) / validResults.length;

  // Set Typing DNA
  await UserRepository.upsertTypingDNA(user.id, {
    baseline_wpm: Math.round(avgWpm),
    avg_wpm: Math.round(avgWpm),
    avg_accuracy: Math.round(avgAccuracy),
    last_assessed_at: new Date().toISOString(),
    sessions_analyzed: validResults.length,
  });

  // Initialize Mastery based on baseline WPM
  // Using some standard skill IDs that we will seed later
  const HOME_ROW_SKILL_ID = '00000000-0000-0000-0000-000000000001';
  const TOP_ROW_SKILL_ID = '00000000-0000-0000-0000-000000000002';
  
  const simulatedSkills = [
    { id: HOME_ROW_SKILL_ID, difficulty_baseline: 1 },
    { id: TOP_ROW_SKILL_ID, difficulty_baseline: 2 },
  ];
  
  const initialMasteryUpdates = calculateMasteryFromDiagnostic(
    Math.round(avgWpm),
    Math.round(avgAccuracy),
    simulatedSkills
  );

  for (const mastery of initialMasteryUpdates) {
    await MasteryRepository.upsertMastery(user.id, {
      student_id: user.id,
      skill_id: mastery.skillId,
      mastery_score: mastery.score,
      mastery_level: mastery.level,
      practice_count: 0,
      skills: { name: mastery.skillId === HOME_ROW_SKILL_ID ? 'Home Row' : 'Top Row' }, // Denormalized name
    });
  }

  // Optional: Save the raw sessions in history
  // ... (Skipping for brevity, diagnostic sessions are mainly for baselining)
}
