import { AdaptiveEngine } from '../adaptive-engine';
import { RecommendationInput, Skill, SkillDependency, SkillMastery } from '@/types/platform';

describe('AdaptiveEngine', () => {
  const domainId = 'domain-1';
  let engine: AdaptiveEngine;

  const mockSkills: Skill[] = [
    { id: 'skill-A', domain_id: domainId, slug: 'a', name: 'A', is_active: true } as Skill,
    { id: 'skill-B', domain_id: domainId, slug: 'b', name: 'B', is_active: true } as Skill,
    { id: 'skill-C', domain_id: domainId, slug: 'c', name: 'C', is_active: true } as Skill,
  ];

  const mockDependencies: SkillDependency[] = [
    { from_skill_id: 'skill-A', to_skill_id: 'skill-B', relationship: 'prerequisite_of' },
    { from_skill_id: 'skill-B', to_skill_id: 'skill-C', relationship: 'prerequisite_of' },
  ];

  beforeEach(() => {
    engine = new AdaptiveEngine();
  });

  it('recommends the first skill if nothing is started', () => {
    const input: RecommendationInput = {
      studentId: 'student-1',
      domainId,
      masteryMap: new Map(),
      skills: mockSkills,
      dependencies: mockDependencies,
      recentAttempts: [],
    };

    const recommendation = engine.getNextRecommendation(input);
    expect(recommendation).not.toBeNull();
    expect(recommendation?.recommended_skill_id).toBe('skill-A');
    expect(recommendation?.priority).toBe(50); // New skill priority
  });

  it('prioritizes weak skills over new skills', () => {
    const masteryMap = new Map<string, SkillMastery>([
      ['skill-A', { mastery_level: 'weak', mastery_score: 20 } as SkillMastery],
    ]);

    const input: RecommendationInput = {
      studentId: 'student-1',
      domainId,
      masteryMap,
      skills: mockSkills,
      dependencies: mockDependencies,
      recentAttempts: [],
    };

    const recommendation = engine.getNextRecommendation(input);
    expect(recommendation).not.toBeNull();
    expect(recommendation?.recommended_skill_id).toBe('skill-A');
    expect(recommendation?.priority).toBe(80); // Weak priority
  });

  it('recommends the next skill once prerequisites are mastered', () => {
    const masteryMap = new Map<string, SkillMastery>([
      ['skill-A', { mastery_level: 'mastered', mastery_score: 95 } as SkillMastery],
    ]);

    const input: RecommendationInput = {
      studentId: 'student-1',
      domainId,
      masteryMap,
      skills: mockSkills,
      dependencies: mockDependencies,
      recentAttempts: [],
    };

    const recommendation = engine.getNextRecommendation(input);
    expect(recommendation).not.toBeNull();
    // B is now ready because A is mastered
    expect(recommendation?.recommended_skill_id).toBe('skill-B');
    expect(recommendation?.priority).toBe(50); // New skill
  });

  it('returns null if all active skills are mastered', () => {
    const masteryMap = new Map<string, SkillMastery>([
      ['skill-A', { mastery_level: 'mastered', mastery_score: 95 } as SkillMastery],
      ['skill-B', { mastery_level: 'mastered', mastery_score: 95 } as SkillMastery],
      ['skill-C', { mastery_level: 'mastered', mastery_score: 95 } as SkillMastery],
    ]);

    const input: RecommendationInput = {
      studentId: 'student-1',
      domainId,
      masteryMap,
      skills: mockSkills,
      dependencies: mockDependencies,
      recentAttempts: [],
    };

    const recommendation = engine.getNextRecommendation(input);
    expect(recommendation).toBeNull();
  });
});
