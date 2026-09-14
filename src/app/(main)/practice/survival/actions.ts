'use server';

import { getUserSession } from '@/lib/aws/auth-utils';
import { SurvivalRepository } from '@/lib/aws/repositories/survival.repository';
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

  await Promise.all([
    SurvivalRepository.saveScore(fullScore),
    SurvivalRepository.upsertLeaderboardEntry(fullScore),
  ]);

  await SurvivalRepository.pruneLeaderboard(score.mode, score.starting_wpm, 10);

  return { success: true };
}

export async function getSurvivalLeaderboard(mode: SurvivalMode, startingWpm: number) {
  const user = await getUserSession();
  if (!user) return { error: 'Not authenticated' };
  const scores = await SurvivalRepository.getLeaderboard(mode, startingWpm, 10);
  return { scores };
}
