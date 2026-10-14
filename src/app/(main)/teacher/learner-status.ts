export type LearnerStatus = 'not_started' | 'needs_reinforcement' | 'inactive' | 'on_track';

export interface MasteryRow {
  skill_id: string;
  mastery_score: number;
  mastery_level: string;
  practice_count: number;
}

const INACTIVE_AFTER_DAYS = 7;

/**
 * Only skills in the current catalog count toward a learner's headline mastery.
 * Per-chunk rows (`chunk:<id>`) are already summarised by the combined
 * `typing-chunks` row, and rows under retired ids no longer map to any skill.
 */
export function isCatalogSkill(skillId: string, catalogIds: ReadonlySet<string>): boolean {
  return catalogIds.has(skillId);
}

export function averageCatalogMastery(rows: MasteryRow[], catalogIds: ReadonlySet<string>): number {
  const counted = rows.filter((row) => isCatalogSkill(row.skill_id, catalogIds));
  if (!counted.length) return 0;
  return Math.round(counted.reduce((sum, row) => sum + row.mastery_score, 0) / counted.length);
}

export function countWeakSkills(rows: MasteryRow[], catalogIds: ReadonlySet<string>): number {
  return rows.filter((row) => isCatalogSkill(row.skill_id, catalogIds) && row.mastery_level === 'weak').length;
}

/**
 * Weak skills outrank inactivity: a learner who is struggling needs a teacher
 * more urgently than one who simply has not practiced lately.
 */
export function classifyLearner(input: {
  hasStarted: boolean;
  daysSincePractice: number | null;
  weakSkills: number;
}): { status: LearnerStatus; reason: string } {
  if (!input.hasStarted) return { status: 'not_started', reason: 'No practice recorded' };

  if (input.weakSkills > 0) {
    const reason = input.weakSkills === 1
      ? '1 skill needs reinforcement'
      : `${input.weakSkills} skills need reinforcement`;
    return { status: 'needs_reinforcement', reason };
  }

  if (input.daysSincePractice === null || input.daysSincePractice > INACTIVE_AFTER_DAYS) {
    return {
      status: 'inactive',
      reason: input.daysSincePractice === null
        ? 'No sessions on record'
        : `Last practiced ${input.daysSincePractice} days ago`,
    };
  }

  return { status: 'on_track', reason: 'On track' };
}

export const STATUS_LABEL: Record<LearnerStatus, string> = {
  not_started: 'Not started',
  needs_reinforcement: 'Struggling',
  inactive: 'Inactive',
  on_track: 'On track',
};

/** Lower number sorts first on the teacher dashboard. */
export const STATUS_PRIORITY: Record<LearnerStatus, number> = {
  needs_reinforcement: 0,
  inactive: 1,
  on_track: 2,
  not_started: 3,
};
