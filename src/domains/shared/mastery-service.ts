import { MasteryLevel, MasteryUpdateInput, SkillMastery } from '@/types/platform';

/**
 * Service for calculating and updating student mastery scores based on new performance evidence.
 */
export class MasteryService {
  /**
   * Determine the categorical MasteryLevel based on the numerical score (0-100).
   */
  public getMasteryLevelFromScore(score: number): MasteryLevel {
    if (score === 0) return 'not_started';
    if (score < 40) return 'weak';
    if (score < 70) return 'developing';
    if (score < 90) return 'strong';
    return 'mastered';
  }

  /**
   * Calculates the new mastery score given the old score and a new performance score.
   * This uses an exponential moving average (EMA) approach to weight recent performance
   * more heavily while maintaining historical stability.
   */
  public calculateNewMasteryScore(
    currentScore: number,
    sessionScore: number,
    practiceCount: number
  ): number {
    if (practiceCount === 0) {
      return sessionScore;
    }

    // Alpha determines how much weight is given to the newest score.
    // We want the first few attempts to move the needle quickly, but stabilize over time.
    const alpha = Math.max(0.1, 0.4 - (practiceCount * 0.05)); // 0.4, 0.35, 0.3, ... min 0.1
    
    const newScore = (alpha * sessionScore) + ((1 - alpha) * currentScore);
    return Number(newScore.toFixed(2));
  }

  /**
   * Processes a new exercise attempt and returns the updated mastery object.
   */
  public processAttempt(
    currentMastery: SkillMastery | undefined,
    studentId: string,
    skillId: string,
    sessionScore: number
  ): MasteryUpdateInput {
    
    const currentScore = currentMastery ? currentMastery.mastery_score : 0;
    const practiceCount = currentMastery ? currentMastery.practice_count : 0;

    const newScore = this.calculateNewMasteryScore(currentScore, sessionScore, practiceCount);
    const newLevel = this.getMasteryLevelFromScore(newScore);

    return {
      studentId,
      skillId,
      newScore,
      newLevel,
    };
  }
}
