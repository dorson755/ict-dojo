import { RecommendationInput, Recommendation, Skill, SkillMastery, ExerciseAttempt } from '@/types/platform';
import { SkillGraph } from './skill-graph';

/**
 * Deterministic engine for selecting the next best skill for a learner.
 *
 * The engine treats mastery as a time-sensitive estimate rather than a permanent
 * label. A strong score that has not been practiced recently should re-enter the
 * queue for retrieval practice, while recent low-scoring attempts raise urgency.
 */
export class AdaptiveEngine {
  private static readonly MASTERY_HALF_LIFE_DAYS = 14;

  /** Apply exponential forgetting to a mastery score. */
  public applyForgetting(score: number, lastPracticedAt: string | null, now = new Date()): number {
    if (!lastPracticedAt) return Math.max(0, Math.min(100, score));

    const elapsedDays = Math.max(
      0,
      (now.getTime() - new Date(lastPracticedAt).getTime()) / 86_400_000
    );
    const retention = Math.pow(0.5, elapsedDays / AdaptiveEngine.MASTERY_HALF_LIFE_DAYS);
    return Number(Math.max(0, Math.min(100, score * retention)).toFixed(2));
  }

  private recentSignal(skillId: string, attempts: ExerciseAttempt[]): number {
    const scores = attempts
      .filter((attempt) => attempt.skill_ids.includes(skillId) && attempt.score !== null)
      .slice(0, 5)
      .map((attempt) => attempt.score as number);

    if (scores.length === 0) return 0;
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return Math.max(0, Math.min(30, 30 - (average * 0.3)));
  }

  private effectiveScore(mastery: SkillMastery | undefined, now: Date): number {
    if (!mastery) return 0;
    return this.applyForgetting(mastery.mastery_score, mastery.last_practiced_at, now);
  }

  /**
   * Evaluates the learner's state and returns a recommendation for the next skill to practice.
   */
  public getNextRecommendation(
    input: RecommendationInput,
    now = new Date()
  ): Omit<Recommendation, 'id' | 'created_at'> | null {
    const { studentId, domainId, masteryMap, skills, dependencies, weakKeys, recentAttempts } = input;
    
    // Check for significant weaknesses first
    if (weakKeys && Object.keys(weakKeys).length > 0) {
      // Find the worst key to mention in the reason
      const worstKey = Object.entries(weakKeys).sort((a, b) => b[1] - a[1])[0][0];
      
      return {
        student_id: studentId,
        domain_id: domainId,
        recommended_skill_id: null, // Doesn't map to a static skill
        recommended_exercise_id: 'ADAPTIVE_WEAKNESS_DRILL', 
        reason: `Based on your recent sessions, you need practice with the letter '${worstKey}'.`,
        priority: 100, // Highest priority
        is_acted_on: false,
      };
    }

    // 1. Initialize the SkillGraph
    const graph = new SkillGraph(skills, dependencies);

    // 2. Get all skills the learner is ready to learn (prereqs met, not yet mastered)
    const readySkills = graph.getReadySkills(masteryMap, domainId);

    if (readySkills.length === 0) {
      // The learner has mastered everything available in this domain.
      return null;
    }

    // 3. Score and rank the ready skills to find the "next best"
    let bestSkill: Skill | null = null;
    let highestPriority = -1;

    for (const skill of readySkills) {
      const mastery = masteryMap.get(skill.id);
      const effectiveScore = this.effectiveScore(mastery, now);
      let priority = 0;

      if (!mastery || mastery.mastery_level === 'not_started') {
        // New skill ready to be introduced
        priority = 50;
      } else {
        // Score-based ranking is more stable than trusting a stale level label.
        priority = effectiveScore < 40 ? 80
          : effectiveScore < 70 ? 60
          : effectiveScore < 90 ? 30
          : 10;
      }

      // Recent failures can override an otherwise healthy historical score.
      priority += this.recentSignal(skill.id, recentAttempts);

      if (priority > highestPriority) {
        highestPriority = priority;
        bestSkill = skill;
      }
    }

    if (!bestSkill) return null;

    // 4. Return the recommendation
    // Note: Recommended exercise generation/selection happens downstream.
    return {
      student_id: studentId,
      domain_id: domainId,
      recommended_skill_id: bestSkill.id,
      recommended_exercise_id: null, 
      reason: `Based on your recent performance and skill retention, focus on ${bestSkill.name}.`,
      priority: highestPriority,
      is_acted_on: false,
    };
  }
}
