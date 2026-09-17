'use server';

import { getUserSession } from '@/lib/aws/auth-utils';
import { MasteryRepository } from '@/lib/aws/repositories/mastery.repository';
import { ExerciseRepository } from '@/lib/aws/repositories/exercise.repository';
import { UserRepository } from '@/lib/aws/repositories/user.repository';
import { ProgressRepository } from '@/lib/aws/repositories/progress.repository';
import { GamificationService } from '@/domains/shared/gamification-service';
import { MasteryService } from '@/domains/shared/mastery-service';
import { TypingEvaluator } from '@/domains/typing/evaluator';
import { TypingSessionInput } from '@/domains/typing/types';
import { TYPING_SKILL_IDS } from '@/domains/typing/catalog';
import { TYPING_CHUNKS, getChunkById } from '@/domains/typing/chunks';
import type { SkillMastery } from '@/types/platform';

const CHUNK_MASTERY_PREFIX = 'chunk:';

function toMasterySnapshot(mastery: Awaited<ReturnType<typeof MasteryRepository.getMastery>>): SkillMastery | undefined {
  if (!mastery) return undefined;
  return {
    id: mastery.skill_id,
    student_id: mastery.student_id,
    skill_id: mastery.skill_id,
    mastery_score: mastery.mastery_score,
    mastery_level: mastery.mastery_level as SkillMastery['mastery_level'],
    practice_count: mastery.practice_count,
    last_practiced_at: mastery.last_practiced_at ?? null,
    updated_at: '',
  };
}

export async function submitChunkPractice(
  chunkId: string,
  sessionData: TypingSessionInput,
  creditedChunkIds?: string[]
) {
  const user = await getUserSession();
  if (!user) throw new Error('Not authenticated');
  if (user.role !== 'student') throw new Error('Only students can practice chunks');

  const evaluator = new TypingEvaluator();
  const result = evaluator.evaluate({ ...sessionData, mode: 'technique' });

  // Anti-grind: how many times this chunk was already drilled today.
  const exerciseId = `chunk-${chunkId}`;
  const today = new Date().toISOString().slice(0, 10);
  const todaySessions = (await ExerciseRepository.getRecentSessions(user.id, 20)).filter(
    (session) =>
      session.exercise_id === exerciseId &&
      String(session.created_at || '').slice(0, 10) === today
  );

  await ExerciseRepository.logSession(user.id, {
    ...result,
    exercise_id: exerciseId,
    skill_ids: [TYPING_SKILL_IDS.chunks],
    score: result.compositeScore,
  });

  // Analyze chunk-specific weaknesses
  const chunkWeaknesses: Record<string, number> = {};
  if (result.keystrokes) {
    result.keystrokes.forEach((ks) => {
      if (ks.expected.length === 1 && !ks.correct) {
        chunkWeaknesses[ks.expected] = (chunkWeaknesses[ks.expected] || 0) + 1;
      }
    });
  }

  const currentDNA = await UserRepository.getTypingDNA(user.id);
  const existingWeakKeys = currentDNA?.weak_keys || {};
  const mergedWeakKeys: Record<string, number> = {};
  Object.keys(existingWeakKeys).forEach((k) => {
    mergedWeakKeys[k] = existingWeakKeys[k] * 0.8;
  });
  Object.keys(chunkWeaknesses).forEach((k) => {
    mergedWeakKeys[k] = (mergedWeakKeys[k] || 0) + chunkWeaknesses[k];
  });
  const sortedWeakKeys = Object.entries(mergedWeakKeys)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const sessionsAnalyzed = (currentDNA?.sessions_analyzed || 0) + 1;
  const averageWpm = ((currentDNA?.avg_wpm || 0) * (sessionsAnalyzed - 1) + result.wpm) / sessionsAnalyzed;
  const averageAccuracy = ((currentDNA?.avg_accuracy || 0) * (sessionsAnalyzed - 1) + result.accuracy) / sessionsAnalyzed;
  await UserRepository.upsertTypingDNA(user.id, {
    weak_keys: Object.fromEntries(sortedWeakKeys),
    sessions_analyzed: sessionsAnalyzed,
    avg_wpm: Number(averageWpm.toFixed(2)),
    avg_accuracy: Number(averageAccuracy.toFixed(2)),
    last_assessed_at: new Date().toISOString(),
  });

  // ── Chunk mastery ──
  // Every chunk gets its own mastery record (skill id "chunk:<id>"), so the
  // student can see per-chunk progress on the Chunk Dojo page.
  const masteryService = new MasteryService();
  const sessionScore = result.accuracy * 0.7 + Math.min(result.wpm / 40, 1) * 30;
  const now = new Date().toISOString();

  const candidateIds = chunkId === 'mixed' ? (creditedChunkIds ?? []) : [chunkId];
  const validChunkIds = candidateIds.filter((id) => Boolean(getChunkById(id)));

  for (const id of validChunkIds) {
    const chunkSkillId = `${CHUNK_MASTERY_PREFIX}${id}`;
    const current = await MasteryRepository.getMastery(user.id, chunkSkillId);
    const { newScore, newLevel } = masteryService.processAttempt(
      toMasterySnapshot(current),
      user.id,
      chunkSkillId,
      sessionScore,
    );
    await MasteryRepository.upsertMastery(user.id, {
      student_id: user.id,
      skill_id: chunkSkillId,
      mastery_score: newScore,
      mastery_level: newLevel,
      practice_count: (current?.practice_count || 0) + 1,
      last_practiced_at: now,
      skills: { name: `Chunks · ${getChunkById(id)?.label ?? id}` },
    });
  }

  // The overall Chunks skill mastery is the average across every chunk in the
  // catalog (unattempted chunks count as zero), and it is only "mastered" once
  // every chunk on the Chunk Dojo page is mastered individually.
  const allMasteries = await MasteryRepository.getAllMastery(user.id);
  const chunkMasteryById = new Map(
    allMasteries
      .filter((m) => m.skill_id.startsWith(CHUNK_MASTERY_PREFIX))
      .map((m) => [m.skill_id.slice(CHUNK_MASTERY_PREFIX.length), m]),
  );
  const sumScores = TYPING_CHUNKS.reduce(
    (sum, chunk) => sum + (chunkMasteryById.get(chunk.id)?.mastery_score ?? 0),
    0,
  );
  const overallScore = Number((sumScores / TYPING_CHUNKS.length).toFixed(2));
  const scoreLevel = masteryService.getMasteryLevelFromScore(overallScore);
  const allChunksMastered = TYPING_CHUNKS.every(
    (chunk) => chunkMasteryById.get(chunk.id)?.mastery_level === 'mastered',
  );
  const overallLevel = allChunksMastered ? 'mastered' : scoreLevel === 'mastered' ? 'strong' : scoreLevel;

  const skillId = TYPING_SKILL_IDS.chunks;
  const currentOverall = await MasteryRepository.getMastery(user.id, skillId);
  await MasteryRepository.upsertMastery(user.id, {
    student_id: user.id,
    skill_id: skillId,
    mastery_score: overallScore,
    mastery_level: overallLevel,
    practice_count: (currentOverall?.practice_count || 0) + 1,
    last_practiced_at: now,
    skills: { name: 'Chunks' },
  });

  // Award XP and streaks
  const gamification = new GamificationService();
  const profile = await UserRepository.getProfile(user.id);
  const xpAward = gamification.calculateSessionXp(result, 2, { repeatsToday: todaySessions.length });
  const levelUpdate = gamification.calculateLevelUpdate(profile?.xp_total ?? 0, profile?.platform_level ?? 1, xpAward.xpGained);
  const streakUpdate = gamification.calculateStreakUpdate(profile?.last_practice_date ?? null, profile?.streak_count ?? 0);
  await UserRepository.awardXp(user.id, xpAward.xpGained, levelUpdate.newLevel);
  await UserRepository.updateStreak(user.id, streakUpdate.streak, new Date().toISOString().split('T')[0]);
  const [newWpmRecord, newAccuracyRecord, quest, weeklyQuest] = await Promise.all([
    ProgressRepository.updatePersonalRecord(user.id, 'best_wpm', result.wpm),
    ProgressRepository.updatePersonalRecord(user.id, 'best_accuracy', result.accuracy),
    ProgressRepository.updateDailyAccuracyQuest(user.id, result.accuracy),
    ProgressRepository.updateWeeklyConsistencyQuest(user.id),
  ]);

  console.log(`[chunk:${chunkId}] user=${user.id} wpm=${result.wpm} accuracy=${result.accuracy}% recordUpdated=${newAccuracyRecord}`);

  return {
    success: true,
    result,
    gamification: {
      xpGained: xpAward.xpGained,
      newTotalXp: levelUpdate.newTotalXp,
      newLevel: levelUpdate.newLevel,
      leveledUp: levelUpdate.leveledUp,
      levelsGained: levelUpdate.levelsGained,
      streak: streakUpdate.streak,
      newWpmRecord,
      newAccuracyRecord,
      quest,
      weeklyQuest,
    },
  };
}
