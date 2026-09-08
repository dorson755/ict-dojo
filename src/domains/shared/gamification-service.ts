import { TypingSessionResult } from '@/domains/typing/types';

/**
 * Service for calculating XP, level progression, and streaks.
 *
 * Design principle (from spec): "Do not incentivize reckless speed;
 * accurate improvement should be prioritized."
 */

export const XP_PER_LEVEL = 1000;

export interface XpAward {
  xpGained: number;
  breakdown: {
    base: number;
    accuracy: number;
    speed: number;
    difficulty: number;
  };
}

export interface LevelUpdate {
  newTotalXp: number;
  newLevel: number;
  leveledUp: boolean;
  levelsGained: number;
}

export interface StreakUpdate {
  streak: number;
  continued: boolean;
  reset: boolean;
}

export class GamificationService {
  /**
   * Calculate XP earned from a practice session.
   * Accuracy is weighted higher than speed to discourage reckless typing.
   */
  public calculateSessionXp(
    result: TypingSessionResult,
    difficulty: number = 1
  ): XpAward {
    const base = 50;

    // Accuracy bonus: 0-50, the primary driver
    const accuracy = Math.round(result.accuracy * 0.5);

    // Speed bonus: 0-15, capped at 60 WPM so rushing doesn't dominate
    const speed = Math.round(Math.min(result.wpm, 60) * 0.25);

    // Difficulty bonus: 10-30 for difficulty 1-3
    const diff = difficulty * 10;

    const xpGained = base + accuracy + speed + diff;

    return {
      xpGained,
      breakdown: { base, accuracy, speed, difficulty: diff },
    };
  }

  /**
   * Calculate XP earned from completing the diagnostic assessment.
   * Award per valid stage completed.
   */
  public calculateDiagnosticXp(validStageCount: number): number {
    return validStageCount * 75;
  }

  /**
   * Calculate new level after awarding XP.
   * Every 1000 XP = 1 level. Level starts at 1.
   */
  public calculateLevelUpdate(
    currentXp: number,
    currentLevel: number,
    xpGained: number
  ): LevelUpdate {
    const newTotalXp = currentXp + xpGained;
    const newLevel = Math.floor(newTotalXp / XP_PER_LEVEL) + 1;
    const leveledUp = newLevel > currentLevel;

    return {
      newTotalXp,
      newLevel,
      leveledUp,
      levelsGained: leveledUp ? newLevel - currentLevel : 0,
    };
  }

  /**
   * Calculate streak update based on last practice date.
   * A streak is consecutive days of practice. Missing a day resets it.
   */
  public calculateStreakUpdate(
    lastPracticeDate: string | null,
    currentStreak: number
  ): StreakUpdate {
    const today = this.todayString();

    if (!lastPracticeDate) {
      return { streak: 1, continued: false, reset: false };
    }

    // Already practiced today — streak unchanged
    if (lastPracticeDate === today) {
      return { streak: currentStreak, continued: true, reset: false };
    }

    // Practiced yesterday — streak continues
    const yesterday = this.daysAgoString(1);
    if (lastPracticeDate === yesterday) {
      return { streak: currentStreak + 1, continued: true, reset: false };
    }

    // Gap > 1 day — streak resets
    return { streak: 1, continued: false, reset: true };
  }

  private todayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  private daysAgoString(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  }
}
