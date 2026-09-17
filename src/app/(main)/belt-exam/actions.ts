'use server';

import { getUserSession } from '@/lib/aws/auth-utils';
import { MasteryRepository } from '@/lib/aws/repositories/mastery.repository';
import { ExerciseRepository } from '@/lib/aws/repositories/exercise.repository';
import { UserRepository } from '@/lib/aws/repositories/user.repository';
import { TypingEvaluator } from '@/domains/typing/evaluator';
import { TypingSessionInput } from '@/domains/typing/types';
import { GamificationService } from '@/domains/shared/gamification-service';
import {
  MAX_BELT,
  computeBelt,
  countChunksMastered,
  getBeltExamTargets,
  getExamSkillIds,
  getMasteryBelt,
  getXpBelt,
} from '@/domains/shared/belt-requirements';
import { getBeltName } from '@/components/ui/BeltBadge';
import type { MasteryLevel } from '@/types/platform';

export interface BeltExamTargets {
  accuracy: number;
  wpm: number;
}

export async function submitBeltExam(belt: number, sessionData: TypingSessionInput) {
  const user = await getUserSession();
  if (!user) throw new Error('Not authenticated');
  if (user.role !== 'student') throw new Error('Only students can take belt exams');

  const profile = await UserRepository.getProfile(user.id);
  const examPassed = profile?.belt_exam_passed ?? 0;
  const level = profile?.platform_level ?? 1;

  // Exams are taken in order, one belt at a time.
  if (belt !== examPassed + 1 || belt > MAX_BELT) {
    throw new Error('This belt exam is not available yet.');
  }

  // Both gates (XP and mastery) must already be met for this belt.
  const allMasteries = await MasteryRepository.getAllMastery(user.id);
  const masteryLevels = Object.fromEntries(
    allMasteries.map((mastery) => [mastery.skill_id, mastery.mastery_level as MasteryLevel])
  ) as Record<string, MasteryLevel>;
  const chunksMastered = countChunksMastered(allMasteries);
  if (getXpBelt(level) < belt || getMasteryBelt(masteryLevels, chunksMastered) < belt) {
    throw new Error('You have not met the requirements for this belt yet.');
  }

  const evaluator = new TypingEvaluator();
  const result = evaluator.evaluate({ ...sessionData, mode: 'accuracy' });
  const targets = getBeltExamTargets(belt);
  const passed = result.accuracy >= targets.accuracy && result.wpm >= targets.wpm;

  await ExerciseRepository.logSession(user.id, {
    ...result,
    exercise_id: `belt-exam-${belt}`,
    skill_ids: getExamSkillIds(belt),
    score: result.compositeScore,
  });

  if (!passed) {
    return { passed: false as const, result, targets };
  }

  await UserRepository.setBeltExamPassed(user.id, belt);

  // Promotion bonus XP — a big chunk that scales with the belt.
  const gamification = new GamificationService();
  const bonusXp = 100 + belt * 50;
  const levelUpdate = gamification.calculateLevelUpdate(profile?.xp_total ?? 0, level, bonusXp);
  await UserRepository.awardXp(user.id, bonusXp, levelUpdate.newLevel);
  const streakUpdate = gamification.calculateStreakUpdate(
    profile?.last_practice_date ?? null,
    profile?.streak_count ?? 0
  );
  await UserRepository.updateStreak(user.id, streakUpdate.streak, new Date().toISOString().split('T')[0]);

  const newBelt = computeBelt(levelUpdate.newLevel, belt, masteryLevels, chunksMastered);

  return {
    passed: true as const,
    result,
    targets,
    xpGained: bonusXp,
    newBelt,
    newBeltName: getBeltName(newBelt),
  };
}
