'use server';

import { getUserSession } from '@/lib/firebase/auth-utils';
import { UserRepository } from '@/lib/firebase/repositories/user.repository';
import { MasteryRepository } from '@/lib/firebase/repositories/mastery.repository';
import { TypingSessionResult } from '@/domains/typing/types';
import { GamificationService } from '@/domains/shared/gamification-service';

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

  // ── Award XP for completing the diagnostic ──
  const gamification = new GamificationService();
  const profile = await UserRepository.getProfile(user.id);
  const currentXp = profile?.xp_total ?? 0;
  const currentLevel = profile?.platform_level ?? 1;
  const currentStreak = profile?.streak_count ?? 0;
  const lastPracticeDate = profile?.last_practice_date ?? null;

  const xpGained = gamification.calculateDiagnosticXp(validResults.length);
  const levelUpdate = gamification.calculateLevelUpdate(currentXp, currentLevel, xpGained);
  const streakUpdate = gamification.calculateStreakUpdate(lastPracticeDate, currentStreak);

  await UserRepository.awardXp(user.id, xpGained, levelUpdate.newLevel);
  await UserRepository.updateStreak(user.id, streakUpdate.streak, new Date().toISOString().split('T')[0]);
}
