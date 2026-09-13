'use server';

import { getUserSession } from '@/lib/aws/auth-utils';
import { MasteryRepository } from '@/lib/aws/repositories/mastery.repository';
import { RecommendationRepository } from '@/lib/aws/repositories/recommendation.repository';
import { ExerciseRepository } from '@/lib/aws/repositories/exercise.repository';
import { UserRepository } from '@/lib/aws/repositories/user.repository';
import { TypingSessionResult } from '@/domains/typing/types';
import { MasteryService } from '@/domains/shared/mastery-service';
import { AdaptiveEngine } from '@/domains/shared/adaptive-engine';
import { GamificationService } from '@/domains/shared/gamification-service';
import { SkillRepository } from '@/lib/aws/repositories/skill.repository';
import type { MasteryLevel, SkillMastery } from '@/types/platform';
import { ProgressRepository } from '@/lib/aws/repositories/progress.repository';

function toMasterySnapshot(
  mastery: {
    student_id: string;
    skill_id: string;
    mastery_score: number;
    mastery_level: string;
    practice_count: number;
    last_practiced_at?: string;
  }
): SkillMastery {
  return {
    id: mastery.skill_id,
    student_id: mastery.student_id,
    skill_id: mastery.skill_id,
    mastery_score: mastery.mastery_score,
    mastery_level: mastery.mastery_level as MasteryLevel,
    practice_count: mastery.practice_count,
    last_practiced_at: mastery.last_practiced_at ?? null,
    updated_at: '',
  };
}

export async function submitPracticeSession(
  result: TypingSessionResult,
  skillIds: string[],
  exerciseId?: string,
  difficulty: number = 1
) {
  const user = await getUserSession();
  if (!user) throw new Error('Not authenticated');

  // Log session
  await ExerciseRepository.logSession(user.id, {
    ...result,
    exercise_id: exerciseId,
    skill_ids: skillIds,
    score: result.compositeScore,
  });

  // Analyze keystrokes for weaknesses
  const sessionWeaknesses: Record<string, number> = {};
  if (result.keystrokes) {
    const errorCounts: Record<string, number> = {};
    const totalExpected: Record<string, number> = {};
    
    result.keystrokes.forEach(ks => {
      // We only care about actual characters, not Backspace or special commands
      if (ks.expected.length === 1) {
        totalExpected[ks.expected] = (totalExpected[ks.expected] || 0) + 1;
        if (!ks.correct) {
          errorCounts[ks.expected] = (errorCounts[ks.expected] || 0) + 1;
        }
      }
    });

    // Simple heuristic: if error rate > 20% and they typed it at least twice, it's a weak key.
    Object.keys(errorCounts).forEach(char => {
      const total = totalExpected[char];
      const errors = errorCounts[char];
      if (total >= 2 && (errors / total) >= 0.2) {
        sessionWeaknesses[char] = errors;
      }
    });
  }

  // Update TypingDNA with weaknesses
  const currentDNA = await UserRepository.getTypingDNA(user.id);
  const existingWeakKeys = currentDNA?.weak_keys || {};
  
  // Merge weaknesses (decay old ones slightly, add new ones)
  const mergedWeakKeys: Record<string, number> = {};
  Object.keys(existingWeakKeys).forEach(k => {
    // Decay previous score to prioritize recent mistakes
    mergedWeakKeys[k] = existingWeakKeys[k] * 0.8; 
  });
  
  Object.keys(sessionWeaknesses).forEach(k => {
    mergedWeakKeys[k] = (mergedWeakKeys[k] || 0) + sessionWeaknesses[k];
  });

  // Keep only top 10 weaknesses
  const sortedWeakKeys = Object.entries(mergedWeakKeys)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
    
  const finalWeakKeys = Object.fromEntries(sortedWeakKeys);
  const sessionsAnalyzed = (currentDNA?.sessions_analyzed || 0) + 1;
  const averageWpm = ((currentDNA?.avg_wpm || 0) * (sessionsAnalyzed - 1) + result.wpm) / sessionsAnalyzed;
  const averageAccuracy = ((currentDNA?.avg_accuracy || 0) * (sessionsAnalyzed - 1) + result.accuracy) / sessionsAnalyzed;

  await UserRepository.upsertTypingDNA(user.id, {
    weak_keys: finalWeakKeys,
    sessions_analyzed: sessionsAnalyzed,
    avg_wpm: Number(averageWpm.toFixed(2)),
    avg_accuracy: Number(averageAccuracy.toFixed(2)),
    last_assessed_at: new Date().toISOString(),
  });

  // Note: The recommendation is superseded by the new one created below,
  // so we don't need to mark the old one as acted on.

  // Evaluate mastery for the skills targeted by this exercise.
  const skills = await SkillRepository.getSkillsByDomain('1');
  const skillById = new Map(skills.map((skill) => [skill.id, skill]));
  const masteryService = new MasteryService();

  for (const skillId of skillIds) {
    const currentMastery = await MasteryRepository.getMastery(user.id, skillId);
    const sessionScore = (result.accuracy * 0.7) + (Math.min(result.wpm / 40, 1) * 30);
    const { newScore, newLevel } = masteryService.processAttempt(
      currentMastery ? toMasterySnapshot(currentMastery) : undefined,
      user.id,
      skillId,
      sessionScore
    );

    // Save history
    await MasteryRepository.logMasteryHistory(user.id, {
      skill_id: skillId,
      previous_score: currentMastery?.mastery_score || 0,
      new_score: newScore,
      source_type: 'practice'
    });

    // Upsert
    await MasteryRepository.upsertMastery(user.id, {
      student_id: user.id,
      skill_id: skillId,
      mastery_score: newScore,
      mastery_level: newLevel,
      practice_count: (currentMastery?.practice_count || 0) + 1,
      last_practiced_at: new Date().toISOString(),
      skills: { name: skillById.get(skillId)?.name ?? 'Typing skill' },
    });
  }

  // Generate the next recommendation from the complete prerequisite graph.
  const allMasteries = await MasteryRepository.getTopMasteredSkills(user.id, 100);
  const masteryMap = new Map(
    allMasteries.map((mastery) => [mastery.skill_id, toMasterySnapshot(mastery)])
  );
  const dependencies = await SkillRepository.getDependenciesByDomain('1');
  const recentSessions = await ExerciseRepository.getRecentSessions(user.id, 10);
  const recentAttempts = recentSessions.map((session) => ({
    id: String(session.SK ?? session.id ?? ''),
    student_id: user.id,
    exercise_id: String(session.exercise_id ?? ''),
    skill_ids: Array.isArray(session.skill_ids) ? session.skill_ids : [],
    started_at: String(session.created_at ?? ''),
    completed_at: String(session.created_at ?? ''),
    completion_status: 'completed' as const,
    score: typeof session.score === 'number' ? session.score : null,
    raw_performance: session,
  }));

  const adaptiveEngine = new AdaptiveEngine();
  const nextTarget = adaptiveEngine.getNextRecommendation({
    studentId: user.id,
    domainId: '1',
    masteryMap,
    skills,
    dependencies,
    recentAttempts,
    weakKeys: finalWeakKeys
  });

  if (nextTarget) {
    await RecommendationRepository.createRecommendation(user.id, {
      domain_id: '1',
      recommended_skill_id: nextTarget.recommended_skill_id,
      reason: nextTarget.reason,
      priority: nextTarget.priority
    });
  }

  // ── Gamification: award XP, update level, update streak ──
  const gamification = new GamificationService();
  const profile = await UserRepository.getProfile(user.id);
  const currentXp = profile?.xp_total ?? 0;
  const currentLevel = profile?.platform_level ?? 1;
  const currentStreak = profile?.streak_count ?? 0;
  const lastPracticeDate = profile?.last_practice_date ?? null;

  const xpAward = gamification.calculateSessionXp(result, difficulty);
  const levelUpdate = gamification.calculateLevelUpdate(currentXp, currentLevel, xpAward.xpGained);
  const streakUpdate = gamification.calculateStreakUpdate(lastPracticeDate, currentStreak);

  await UserRepository.awardXp(user.id, xpAward.xpGained, levelUpdate.newLevel);
  await UserRepository.updateStreak(user.id, streakUpdate.streak, new Date().toISOString().split('T')[0]);
  const [newWpmRecord, newAccuracyRecord, quest, weeklyQuest] = await Promise.all([
    ProgressRepository.updatePersonalRecord(user.id, 'best_wpm', result.wpm),
    ProgressRepository.updatePersonalRecord(user.id, 'best_accuracy', result.accuracy),
    ProgressRepository.updateDailyAccuracyQuest(user.id, result.accuracy),
    ProgressRepository.updateWeeklyConsistencyQuest(user.id),
  ]);

  return {
    success: true,
    result,
    nextRecommendation: nextTarget,
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
