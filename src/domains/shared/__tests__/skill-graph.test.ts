import { SkillGraph } from '../skill-graph';
import { Skill, SkillDependency, SkillMastery } from '@/types/platform';

describe('SkillGraph', () => {
  const domainId = 'domain-1';
  
  const mockSkills: Skill[] = [
    { id: 'skill-A', domain_id: domainId, slug: 'a', name: 'A', is_active: true } as Skill,
    { id: 'skill-B', domain_id: domainId, slug: 'b', name: 'B', is_active: true } as Skill,
    { id: 'skill-C', domain_id: domainId, slug: 'c', name: 'C', is_active: true } as Skill,
    { id: 'skill-D', domain_id: domainId, slug: 'd', name: 'D', is_active: true } as Skill,
  ];

  const mockDependencies: SkillDependency[] = [
    { from_skill_id: 'skill-A', to_skill_id: 'skill-B', relationship: 'prerequisite_of' },
    { from_skill_id: 'skill-B', to_skill_id: 'skill-C', relationship: 'prerequisite_of' },
    { from_skill_id: 'skill-A', to_skill_id: 'skill-D', relationship: 'prerequisite_of' },
  ];

  let graph: SkillGraph;

  beforeEach(() => {
    graph = new SkillGraph(mockSkills, mockDependencies);
  });

  it('determines prerequisites are met if a skill has none', () => {
    const masteryMap = new Map<string, SkillMastery>();
    expect(graph.arePrerequisitesMet('skill-A', masteryMap)).toBe(true);
  });

  it('determines prerequisites are not met if prior skill is not started', () => {
    const masteryMap = new Map<string, SkillMastery>();
    expect(graph.arePrerequisitesMet('skill-B', masteryMap)).toBe(false);
  });

  it('determines prerequisites are not met if prior skill is weak or developing', () => {
    const masteryMap = new Map<string, SkillMastery>([
      ['skill-A', { mastery_level: 'developing', mastery_score: 50 } as SkillMastery],
    ]);
    expect(graph.arePrerequisitesMet('skill-B', masteryMap)).toBe(false);
  });

  it('determines prerequisites are met if prior skill is strong or mastered', () => {
    const masteryMap = new Map<string, SkillMastery>([
      ['skill-A', { mastery_level: 'strong', mastery_score: 85 } as SkillMastery],
    ]);
    expect(graph.arePrerequisitesMet('skill-B', masteryMap)).toBe(true);
  });

  it('gets ready skills correctly for a brand new student', () => {
    const masteryMap = new Map<string, SkillMastery>();
    const ready = graph.getReadySkills(masteryMap, domainId);
    
    // Only A has no prerequisites
    expect(ready.length).toBe(1);
    expect(ready[0].id).toBe('skill-A');
  });

  it('gets ready skills correctly after mastering the first skill', () => {
    const masteryMap = new Map<string, SkillMastery>([
      ['skill-A', { mastery_level: 'mastered', mastery_score: 95 } as SkillMastery],
    ]);
    const ready = graph.getReadySkills(masteryMap, domainId);
    
    // A is mastered (so excluded). B and D have A as a prereq, so they are ready.
    expect(ready.length).toBe(2);
    expect(ready.map(s => s.id)).toContain('skill-B');
    expect(ready.map(s => s.id)).toContain('skill-D');
  });
});
