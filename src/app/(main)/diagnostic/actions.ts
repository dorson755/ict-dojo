'use server';

import { getUserSession } from '@/lib/aws/auth-utils';
import { UserRepository } from '@/lib/aws/repositories/user.repository';
import { MasteryRepository } from '@/lib/aws/repositories/mastery.repository';
import { DiagnosticStageAttempt, TypingSessionResult } from '@/domains/typing/types';
import { GamificationService } from '@/domains/shared/gamification-service';
import { MasteryService } from '@/domains/shared/mastery-service';
import { SkillRepository } from '@/lib/aws/repositories/skill.repository';
import type { MasteryLevel } from '@/types/platform';

function diagnosticScore(result: TypingSessionResult): number {
  return Math.min(100, (result.accuracy * 0.75) + (Math.min(result.wpm / 40, 1) * 25));
}

export async function submitDiagnostic(results: DiagnosticStageAttempt[]) {
  const user = await getUserSession();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Aggregate results
  const validResults = results
    .map((attempt) => attempt.sessionResult)
    .filter((result) => result.isValid);
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

  const skills = await SkillRepository.getSkillsByDomain('1');
  const skillById = new Map(skills.map((skill) => [skill.id, skill]));
  const measurements = new Map<string, number[]>();
  for (const attempt of results) {
    if (!attempt.sessionResult.isValid) continue;
    for (const skillId of attempt.skillIds) {
      const scores = measurements.get(skillId) ?? [];
      scores.push(diagnosticScore(attempt.sessionResult));
      measurements.set(skillId, scores);
    }
  }

  const masteryService = new MasteryService();
  for (const [skillId, scores] of measurements) {
    const score = scores.reduce((total, value) => total + value, 0) / scores.length;
    const level: MasteryLevel = masteryService.getMasteryLevelFromScore(score);
    await MasteryRepository.upsertMastery(user.id, {
      student_id: user.id,
      skill_id: skillId,
      mastery_score: Number(score.toFixed(2)),
      mastery_level: level,
      practice_count: 0,
      skills: { name: skillById.get(skillId)?.name ?? 'Typing skill' },
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
