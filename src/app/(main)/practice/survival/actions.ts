'use server';

import { getUserSession } from '@/lib/aws/auth-utils';
import { SurvivalRepository } from '@/lib/aws/repositories/survival.repository';
import { ProgressRepository } from '@/lib/aws/repositories/progress.repository';
import type { SurvivalMode, SurvivalScore } from '@/lib/aws/repositories/survival.repository';

export async function saveSurvivalScore(
  score: Omit<SurvivalScore, 'created_at' | 'user_id' | 'user_name'>,
) {
  const user = await getUserSession();
  if (!user) return { error: 'Not authenticated' };
  if (user.role !== 'student') return { error: 'Only students can post survival scores' };

  const fullScore: SurvivalScore = {
    ...score,
    user_id: user.id,
    user_name: user.name || 'Learner',
    created_at: new Date().toISOString(),
  };

  const [, newAccuracyRecord] = await Promise.all([
    ProgressRepository.updatePersonalRecord(user.id, 'best_wpm', score.final_wpm),
    ProgressRepository.updatePersonalRecord(user.id, 'best_accuracy', score.accuracy),
  ]);

  await Promise.all([
    SurvivalRepository.saveScore(fullScore),
    SurvivalRepository.upsertLeaderboardEntry(fullScore),
  ]);

  await SurvivalRepository.pruneLeaderboard(score.mode, score.starting_wpm, 10);

  console.log(`[survival:${score.mode}] user=${user.id} wpm=${score.final_wpm} accuracy=${score.accuracy}% recordUpdated=${newAccuracyRecord}`);

  return { success: true };
}

export async function getSurvivalLeaderboard(mode: SurvivalMode, startingWpm: number) {
  const user = await getUserSession();
  if (!user) return { error: 'Not authenticated' };
  try {
    const scores = await SurvivalRepository.getLeaderboard(mode, startingWpm, 10);
    return { scores };
  } catch {
    return { error: 'Leaderboard is temporarily unavailable.' };
  }
}
