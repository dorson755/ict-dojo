import { RecommendationInput, Recommendation, Skill } from '@/types/platform';
import { SkillGraph } from './skill-graph';

/**
 * Deterministic engine for determining the next best skill for a learner to practice.
 * 
 * Rules:
 * 1. Prioritize 'weak' or 'developing' skills that have their prerequisites met.
 * 2. If all current ready skills are 'strong' or 'mastered', introduce a new skill (not_started).
 * 3. Incorporate spaced repetition / decay (future enhancement: check last_practiced_at).
 */
export class AdaptiveEngine {
  /**
   * Evaluates the learner's state and returns a recommendation for the next skill to practice.
   */
  public getNextRecommendation(input: RecommendationInput): Omit<Recommendation, 'id' | 'created_at'> | null {
    const { studentId, domainId, masteryMap, skills, dependencies, recentAttempts } = input;
    
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
      let priority = 0;

      if (!mastery || mastery.mastery_level === 'not_started') {
        // New skill ready to be introduced
        priority = 50; 
      } else if (mastery.mastery_level === 'weak') {
        // High priority: student struggled with this recently
        priority = 80;
      } else if (mastery.mastery_level === 'developing') {
        // Medium priority: student is learning this
        priority = 60;
      } else if (mastery.mastery_level === 'strong') {
        // Low priority: almost mastered, good for warmup
        priority = 30;
      }

      // Future enhancement: factor in 'last_practiced_at' to increase priority of skills decaying

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
      reason: `Based on your mastery, you are ready to focus on ${bestSkill.name}.`,
      priority: highestPriority,
      is_acted_on: false,
    };
  }
}
