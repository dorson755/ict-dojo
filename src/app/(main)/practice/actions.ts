'use server';

import { getUserSession } from '@/lib/aws/auth-utils';
import { MasteryRepository } from '@/lib/aws/repositories/mastery.repository';
import { RecommendationRepository } from '@/lib/aws/repositories/recommendation.repository';
import { ExerciseRepository } from '@/lib/aws/repositories/exercise.repository';
import { UserRepository } from '@/lib/aws/repositories/user.repository';
import { TypingSessionResult } from '@/domains/typing/types';
import { MasteryService } from '@/domains/shared/mastery-service';
import { AdaptiveEngine } from '@/domains/shared/adaptive-engine';
import { SkillGraph } from '@/domains/shared/skill-graph';

export async function submitPracticeSession(
  result: TypingSessionResult,
  skillIds: string[],
  activeRecId?: string
) {
  const user = await getUserSession();
  if (!user) throw new Error('Not authenticated');

  // Log session
  await ExerciseRepository.logSession(user.id, result);

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

  await UserRepository.upsertTypingDNA(user.id, {
    weak_keys: finalWeakKeys,
    sessions_analyzed: (currentDNA?.sessions_analyzed || 0) + 1
  });

  // Mark recommendation as acted on if passed in
  if (activeRecId) {
    await RecommendationRepository.markAsActedOn(user.id, activeRecId);
  }

  // Evaluate Mastery updates
  // In a real app we'd fetch the skill graph from DynamoDB. For now we use standard IDs.
  const HOME_ROW_SKILL_ID = '00000000-0000-0000-0000-000000000001';
  
  const masteryService = new MasteryService();

  for (const skillId of skillIds) {
    const currentMastery = await MasteryRepository.getMastery(user.id, skillId);
    
    // Evaluate
    const sessionScore = (result.accuracy * 0.7) + (Math.min(result.wpm / 40, 1) * 30);
    const { newScore, newLevel } = masteryService.processAttempt(
      currentMastery ? { ...currentMastery, student_id: user.id } as any : undefined,
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
      skills: { name: 'Home Row' } // Denormalized
    });
  }

  // Generate new recommendation
  const allMasteries = await MasteryRepository.getTopMasteredSkills(user.id, 100);
  const masteryMap = new Map(allMasteries.map(m => [m.skill_id, m.mastery_level as any]));

  const adaptiveEngine = new AdaptiveEngine();
  const nextTarget = adaptiveEngine.getNextRecommendation({
    studentId: user.id,
    domainId: '1',
    masteryMap: masteryMap,
    skills: [{
      id: HOME_ROW_SKILL_ID,
      domain_id: '1',
      parent_skill_id: null,
      slug: 'home-row',
      name: 'Home Row',
      description: null,
      grade_level_min: null,
      grade_level_max: null,
      difficulty_baseline: 1,
      is_active: true,
      metadata: {},
      created_at: new Date().toISOString()
    }],
    dependencies: [],
    recentAttempts: [],
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

  return {
    success: true,
    result,
    nextRecommendation: nextTarget
  };
}
