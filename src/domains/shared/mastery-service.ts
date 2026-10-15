import { MasteryLevel, MasteryUpdateInput, SkillMastery } from '../../types/platform';

/**
 * Service for calculating and updating student mastery scores based on new performance evidence.
 */
export class MasteryService {
  /**
   * A single session can never mark a skill "mastered" — the first attempt is
   * capped at the top of the "strong" band so mastery requires sustained
   * performance across sessions.
   */
  private static readonly FIRST_ATTEMPT_SCORE_CAP = 85;

  /**
   * Accuracy carries 70% of a session score, so a slow but careful typist can
   * score highly. These minimum speeds stop a skill being labelled strong or
   * mastered until the learner types at a usable pace. They only limit the
   * label; the score stays an honest record of the session.
   */
  private static readonly MIN_WPM_FOR_STRONG = 20;
  private static readonly MIN_WPM_FOR_MASTERED = 30;

  /**
   * Lowers a level that the speed has not earned. A missing or invalid speed
   * means no information, so the level is left alone.
   */
  public capLevelBySpeed(level: MasteryLevel, wpm: number | undefined): MasteryLevel {
    if (wpm === undefined || !Number.isFinite(wpm)) return level;
    if (level === 'mastered' && wpm < MasteryService.MIN_WPM_FOR_MASTERED) {
      return wpm < MasteryService.MIN_WPM_FOR_STRONG ? 'developing' : 'strong';
    }
    if (level === 'strong' && wpm < MasteryService.MIN_WPM_FOR_STRONG) return 'developing';
    return level;
  }

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
      return Math.min(sessionScore, MasteryService.FIRST_ATTEMPT_SCORE_CAP);
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
    sessionScore: number,
    sessionWpm?: number
  ): MasteryUpdateInput {
    
    const currentScore = currentMastery ? currentMastery.mastery_score : 0;
    const practiceCount = currentMastery ? currentMastery.practice_count : 0;

    const newScore = this.calculateNewMasteryScore(currentScore, sessionScore, practiceCount);
    const newLevel = this.capLevelBySpeed(this.getMasteryLevelFromScore(newScore), sessionWpm);

    return {
      studentId,
      skillId,
      newScore,
      newLevel,
    };
  }
}
