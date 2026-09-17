import { TYPING_SKILL_IDS } from '@/domains/typing/catalog';
import type { MasteryLevel } from '../../types/platform';

/**
 * Belt progression rules.
 *
 * A belt is earned only when all three gates are satisfied:
 *   1. XP gate       — enough levels (1000 XP per level, 5 levels per belt)
 *   2. Mastery gate  — the belt's required skills are at the required levels
 *   3. Exam gate     — the belt's promotion exam has been passed
 *
 * XP keeps accumulating while a gate is unmet, and the belt promotes the
 * moment the last gate is satisfied (belt = min of the three).
 */
export const MAX_BELT = 7;

export interface SkillRequirement {
  skillId: string;
  minLevel: MasteryLevel;
}

export interface BeltRequirements {
  skills: SkillRequirement[];
  chunksMastered: number;
}

const LEVEL_ORDER: Record<MasteryLevel, number> = {
  not_started: 0,
  weak: 1,
  developing: 2,
  strong: 3,
  mastered: 4,
};

export function meetsLevel(current: MasteryLevel | undefined, min: MasteryLevel): boolean {
  return LEVEL_ORDER[current ?? 'not_started'] >= LEVEL_ORDER[min];
}

// Each belt adds requirements on top of the previous belt.
const NEW_REQUIREMENTS: Record<number, Omit<BeltRequirements, 'skills'> & { skills: SkillRequirement[] }> = {
  1: {
    skills: [
      { skillId: TYPING_SKILL_IDS.homeRow, minLevel: 'strong' },
      { skillId: TYPING_SKILL_IDS.topRow, minLevel: 'developing' },
    ],
    chunksMastered: 0,
  },
  2: {
    skills: [
      { skillId: TYPING_SKILL_IDS.bottomRow, minLevel: 'strong' },
      { skillId: TYPING_SKILL_IDS.commonWords, minLevel: 'developing' },
    ],
    chunksMastered: 0,
  },
  3: {
    skills: [
      { skillId: TYPING_SKILL_IDS.commonWords, minLevel: 'strong' },
      { skillId: TYPING_SKILL_IDS.sentenceFluency, minLevel: 'developing' },
    ],
    chunksMastered: 10,
  },
  4: {
    skills: [
      { skillId: TYPING_SKILL_IDS.sentenceFluency, minLevel: 'strong' },
      { skillId: TYPING_SKILL_IDS.capitalization, minLevel: 'developing' },
    ],
    chunksMastered: 25,
  },
  5: {
    skills: [
      { skillId: TYPING_SKILL_IDS.capitalization, minLevel: 'strong' },
      { skillId: TYPING_SKILL_IDS.punctuation, minLevel: 'developing' },
    ],
    chunksMastered: 40,
  },
  6: {
    skills: [
      { skillId: TYPING_SKILL_IDS.punctuation, minLevel: 'strong' },
      { skillId: TYPING_SKILL_IDS.numbers, minLevel: 'developing' },
    ],
    chunksMastered: 55,
  },
  7: {
    skills: [
      { skillId: TYPING_SKILL_IDS.keyboardFamiliarity, minLevel: 'mastered' },
      { skillId: TYPING_SKILL_IDS.homeRow, minLevel: 'mastered' },
      { skillId: TYPING_SKILL_IDS.topRow, minLevel: 'mastered' },
      { skillId: TYPING_SKILL_IDS.bottomRow, minLevel: 'mastered' },
      { skillId: TYPING_SKILL_IDS.commonWords, minLevel: 'mastered' },
      { skillId: TYPING_SKILL_IDS.sentenceFluency, minLevel: 'mastered' },
      { skillId: TYPING_SKILL_IDS.capitalization, minLevel: 'mastered' },
      { skillId: TYPING_SKILL_IDS.punctuation, minLevel: 'mastered' },
      { skillId: TYPING_SKILL_IDS.numbers, minLevel: 'mastered' },
      { skillId: TYPING_SKILL_IDS.codingSyntax, minLevel: 'mastered' },
    ],
    chunksMastered: 63,
  },
};

// Cumulative requirements per belt index.
export const BELT_REQUIREMENTS: BeltRequirements[] = (() => {
  const ladder: BeltRequirements[] = [{ skills: [], chunksMastered: 0 }]; // White: starter belt
  for (let belt = 1; belt <= MAX_BELT; belt++) {
    const added = NEW_REQUIREMENTS[belt];
    const combined = [...ladder[belt - 1].skills, ...added.skills];
    const strongestBySkill = new Map<string, SkillRequirement>();
    for (const requirement of combined) {
      const existing = strongestBySkill.get(requirement.skillId);
      if (!existing || LEVEL_ORDER[requirement.minLevel] > LEVEL_ORDER[existing.minLevel]) {
        strongestBySkill.set(requirement.skillId, requirement);
      }
    }
    ladder.push({
      skills: [...strongestBySkill.values()],
      chunksMastered: added.chunksMastered,
    });
  }
  return ladder;
})();

/** The level a student must reach for the given belt (each belt = 5 levels). */
export function getRequiredLevel(belt: number): number {
  return belt * 5 + 1;
}

/** Belt earned from XP alone (the effort gate). */
export function getXpBelt(level: number): number {
  return Math.min(MAX_BELT, Math.floor((Math.max(1, level) - 1) / 5));
}

/** Belt earned from skill mastery alone (the competence gate). */
export function getMasteryBelt(
  masteryLevels: Record<string, MasteryLevel>,
  chunksMastered: number
): number {
  let belt = 0;
  for (let candidate = 1; candidate <= MAX_BELT; candidate++) {
    const reqs = BELT_REQUIREMENTS[candidate];
    const skillsMet = reqs.skills.every((req) => meetsLevel(masteryLevels[req.skillId], req.minLevel));
    if (!skillsMet || chunksMastered < reqs.chunksMastered) break;
    belt = candidate;
  }
  return belt;
}

/** The student's actual belt: all three gates must be satisfied. */
export function computeBelt(
  level: number,
  examPassed: number,
  masteryLevels: Record<string, MasteryLevel>,
  chunksMastered: number
): number {
  return Math.min(getXpBelt(level), examPassed, getMasteryBelt(masteryLevels, chunksMastered));
}

/** Requirements for a belt as a UI-ready checklist. */
export interface BeltChecklist {
  xp: { currentLevel: number; requiredLevel: number; met: boolean };
  skills: Array<SkillRequirement & { current: MasteryLevel; met: boolean }>;
  chunks: { current: number; required: number; met: boolean };
}

export function evaluateBeltRequirements(
  belt: number,
  level: number,
  masteryLevels: Record<string, MasteryLevel>,
  chunksMastered: number
): BeltChecklist {
  const reqs = BELT_REQUIREMENTS[Math.min(belt, MAX_BELT)];
  const requiredLevel = getRequiredLevel(belt);
  return {
    xp: { currentLevel: level, requiredLevel, met: level >= requiredLevel },
    skills: reqs.skills.map((req) => ({
      ...req,
      current: masteryLevels[req.skillId] ?? 'not_started',
      met: meetsLevel(masteryLevels[req.skillId], req.minLevel),
    })),
    chunks: { current: chunksMastered, required: reqs.chunksMastered, met: chunksMastered >= reqs.chunksMastered },
  };
}

/** Pass thresholds for a belt's promotion exam. */
export function getBeltExamTargets(belt: number): { accuracy: number; wpm: number } {
  return { accuracy: 90, wpm: 15 + belt * 5 };
}

/** The skill ids a belt's exam drills (the belt's required skills plus chunks). */
export function getExamSkillIds(belt: number): string[] {
  const reqs = BELT_REQUIREMENTS[Math.min(belt, MAX_BELT)];
  const ids = new Set(reqs.skills.map((req) => req.skillId));
  ids.add(TYPING_SKILL_IDS.chunks);
  return [...ids];
}

/** Counts individually mastered chunks (per-chunk "chunk:<id>" mastery records). */
export function countChunksMastered(
  masteries: Array<{ skill_id: string; mastery_level: string }>
): number {
  return masteries.filter((m) => m.skill_id.startsWith('chunk:') && m.mastery_level === 'mastered').length;
}
