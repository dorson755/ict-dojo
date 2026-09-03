import { Skill, SkillDependency, SkillMastery } from '@/types/platform';

/**
 * Service for analyzing and traversing the skill graph to determine
 * prerequisite satisfaction and identify the next skills a learner is ready for.
 */
export class SkillGraph {
  private skills: Map<string, Skill> = new Map();
  private dependencies: SkillDependency[] = [];
  
  /** Map of to_skill_id -> from_skill_id[] (what must be learned BEFORE this skill) */
  private prerequisitesMap: Map<string, string[]> = new Map();

  /** Map of from_skill_id -> to_skill_id[] (what learning this skill UNLOCKS) */
  private unlocksMap: Map<string, string[]> = new Map();

  constructor(skills: Skill[], dependencies: SkillDependency[]) {
    this.initializeGraph(skills, dependencies);
  }

  private initializeGraph(skills: Skill[], dependencies: SkillDependency[]) {
    skills.forEach(skill => {
      this.skills.set(skill.id, skill);
      this.prerequisitesMap.set(skill.id, []);
      this.unlocksMap.set(skill.id, []);
    });

    this.dependencies = dependencies;

    // Build adjacency lists for 'prerequisite_of' relationship
    dependencies.forEach(dep => {
      if (dep.relationship === 'prerequisite_of') {
        const prereqs = this.prerequisitesMap.get(dep.to_skill_id);
        if (prereqs) {
          prereqs.push(dep.from_skill_id);
        }

        const unlocks = this.unlocksMap.get(dep.from_skill_id);
        if (unlocks) {
          unlocks.push(dep.to_skill_id);
        }
      }
    });
  }

  /**
   * Determine if a student has met all prerequisites for a given skill.
   * A prerequisite is met if its mastery level is 'strong' or 'mastered'.
   */
  public arePrerequisitesMet(skillId: string, masteryMap: Map<string, SkillMastery>): boolean {
    const prereqs = this.prerequisitesMap.get(skillId) || [];
    
    if (prereqs.length === 0) return true;

    return prereqs.every(prereqId => {
      const mastery = masteryMap.get(prereqId);
      return mastery && (mastery.mastery_level === 'strong' || mastery.mastery_level === 'mastered');
    });
  }

  /**
   * Get a list of skills that the student is ready to learn.
   * This includes:
   * 1. Skills with no prerequisites.
   * 2. Skills where all prerequisites are met.
   * It excludes skills that are already 'mastered' (unless they are 'weak' and need review, which AdaptiveEngine handles).
   */
  public getReadySkills(masteryMap: Map<string, SkillMastery>, domainId: string): Skill[] {
    const readySkills: Skill[] = [];

    for (const skill of this.skills.values()) {
      if (skill.domain_id !== domainId || !skill.is_active) continue;

      const mastery = masteryMap.get(skill.id);
      
      // Skip already mastered skills (we are looking for new or developing things)
      if (mastery?.mastery_level === 'mastered') continue;

      if (this.arePrerequisitesMet(skill.id, masteryMap)) {
        readySkills.push(skill);
      }
    }

    return readySkills;
  }

  /**
   * Get all prerequisites for a given skill (direct only).
   */
  public getDirectPrerequisites(skillId: string): Skill[] {
    const prereqIds = this.prerequisitesMap.get(skillId) || [];
    return prereqIds
      .map(id => this.skills.get(id))
      .filter((skill): skill is Skill => skill !== undefined);
  }
}
