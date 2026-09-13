import type { Skill, SkillDependency } from '../../types/platform';

export const PROGRAMMING_DOMAIN_ID = 'programming';

export const PYTHON_SKILL_IDS = {
  variables: 'python-variables',
  dataTypes: 'python-data-types',
  conditions: 'python-conditions',
  loops: 'python-loops',
  functions: 'python-functions',
} as const;

const skill = (id: string, name: string, description: string, difficulty: number): Skill => ({
  id,
  domain_id: PROGRAMMING_DOMAIN_ID,
  parent_skill_id: null,
  slug: id,
  name,
  description,
  grade_level_min: 9,
  grade_level_max: 12,
  difficulty_baseline: difficulty,
  is_active: true,
  metadata: { language: 'python' },
  created_at: '',
});

export const PYTHON_SKILLS = [
  skill(PYTHON_SKILL_IDS.variables, 'Variables', 'Store and update values in Python.', 1),
  skill(PYTHON_SKILL_IDS.dataTypes, 'Data types', 'Work with strings, numbers, and booleans.', 2),
  skill(PYTHON_SKILL_IDS.conditions, 'Conditions', 'Choose program paths with if statements.', 3),
  skill(PYTHON_SKILL_IDS.loops, 'Loops', 'Repeat work with for and while loops.', 4),
  skill(PYTHON_SKILL_IDS.functions, 'Functions', 'Organize reusable program behavior.', 5),
];

export const PYTHON_DEPENDENCIES: SkillDependency[] = [
  { from_skill_id: PYTHON_SKILL_IDS.variables, to_skill_id: PYTHON_SKILL_IDS.dataTypes, relationship: 'prerequisite_of' },
  { from_skill_id: PYTHON_SKILL_IDS.dataTypes, to_skill_id: PYTHON_SKILL_IDS.conditions, relationship: 'prerequisite_of' },
  { from_skill_id: PYTHON_SKILL_IDS.conditions, to_skill_id: PYTHON_SKILL_IDS.loops, relationship: 'prerequisite_of' },
  { from_skill_id: PYTHON_SKILL_IDS.loops, to_skill_id: PYTHON_SKILL_IDS.functions, relationship: 'prerequisite_of' },
];
