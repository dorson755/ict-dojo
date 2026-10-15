import {
  MAX_BELT,
  computeBelt,
  countChunksMastered,
  evaluateBeltRequirements,
  getMasteryBelt,
  getXpBelt,
  type BeltChecklist,
} from '@/domains/shared/belt-requirements';
import type { MasteryLevel } from '@/types/platform';

export type BeltBlocker = 'xp' | 'skills' | 'exam' | 'max';

export interface BeltStatus {
  belt: number;
  nextBelt: number | null;
  xpBelt: number;
  masteryBelt: number;
  examBelt: number;
  /** XP and skills both cover the next belt, so only the promotion exam is left. */
  examReady: boolean;
  /** Gates still unmet for the next belt, in the order a teacher would coach them. */
  blockers: BeltBlocker[];
  checklist: BeltChecklist | null;
}

export interface BeltInput {
  level: number;
  examPassed: number | null | undefined;
  mastery: Array<{ skill_id: string; mastery_level: string }>;
}

const BLOCKER_LABEL: Record<BeltBlocker, string> = {
  xp: 'Needs more XP',
  skills: 'Needs skill mastery',
  exam: 'Exam ready',
  max: 'Top belt',
};

export function beltBlockerLabel(blocker: BeltBlocker): string {
  return BLOCKER_LABEL[blocker];
}

export function toMasteryLevels(
  mastery: Array<{ skill_id: string; mastery_level: string }>
): Record<string, MasteryLevel> {
  return Object.fromEntries(
    mastery.map((item) => [item.skill_id, item.mastery_level as MasteryLevel])
  ) as Record<string, MasteryLevel>;
}

export function beltStatus({ level, examPassed, mastery }: BeltInput): BeltStatus {
  const safeLevel = Math.max(1, Number.isFinite(level) ? Math.floor(level) : 1);
  const levels = toMasteryLevels(mastery);
  const chunks = countChunksMastered(mastery);
  const examBelt = Math.max(0, Math.min(MAX_BELT, Math.floor(Number(examPassed) || 0)));
  const xpBelt = getXpBelt(safeLevel);
  const masteryBelt = getMasteryBelt(levels, chunks);
  const belt = computeBelt(safeLevel, examBelt, levels, chunks);

  if (belt >= MAX_BELT) {
    return { belt, nextBelt: null, xpBelt, masteryBelt, examBelt, examReady: false, blockers: ['max'], checklist: null };
  }

  const nextBelt = belt + 1;
  const blockers: BeltBlocker[] = [];
  if (xpBelt < nextBelt) blockers.push('xp');
  if (masteryBelt < nextBelt) blockers.push('skills');
  const examReady = blockers.length === 0;
  if (examReady) blockers.push('exam');

  return {
    belt,
    nextBelt,
    xpBelt,
    masteryBelt,
    examBelt,
    examReady,
    blockers,
    checklist: evaluateBeltRequirements(nextBelt, safeLevel, levels, chunks),
  };
}

export interface BeltCount {
  belt: number;
  count: number;
}

/** Learners per belt, from White through one past the highest belt held. */
export function beltDistribution(belts: number[]): BeltCount[] {
  const top = Math.min(MAX_BELT, Math.max(0, ...belts) + 1);
  return Array.from({ length: top + 1 }, (_, belt) => ({
    belt,
    count: belts.filter((value) => value === belt).length,
  }));
}

export interface BeltGateRow {
  key: string;
  label: string;
  detail: string;
  met: boolean;
}

const LEVEL_WORD: Record<string, string> = {
  not_started: 'not started',
  weak: 'weak',
  developing: 'developing',
  strong: 'strong',
  mastered: 'mastered',
};

/** The next belt's requirements as plain rows: XP, each skill, chunks, then the exam. */
export function beltGateRows(
  status: BeltStatus,
  skillName: (id: string) => string,
): BeltGateRow[] {
  const { checklist } = status;
  if (!checklist) return [];
  const rows: BeltGateRow[] = [
    {
      key: 'xp',
      label: `Reach level ${checklist.xp.requiredLevel}`,
      detail: `Now level ${checklist.xp.currentLevel}`,
      met: checklist.xp.met,
    },
    ...checklist.skills.map((skill) => ({
      key: skill.skillId,
      label: `${skillName(skill.skillId)} at ${LEVEL_WORD[skill.minLevel]}`,
      detail: `Now ${LEVEL_WORD[skill.current]}`,
      met: skill.met,
    })),
  ];
  if (checklist.chunks.required > 0) {
    rows.push({
      key: 'chunks',
      label: `Master ${checklist.chunks.required} chunks`,
      detail: `Now ${checklist.chunks.current}`,
      met: checklist.chunks.met,
    });
  }
  rows.push({
    key: 'exam',
    label: 'Pass the promotion exam',
    detail: status.examReady ? 'Unlocked, not taken yet' : 'Unlocks once the rows above are met',
    met: status.examBelt >= (status.nextBelt ?? 0),
  });
  return rows;
}

/** One short line for the roster explaining what stands between a learner and the next belt. */
export function beltBlockerSummary(status: BeltStatus): string {
  if (status.nextBelt === null) return 'Top belt reached';
  if (status.examReady) return 'Ready for the promotion exam';
  const parts: string[] = [];
  if (status.blockers.includes('xp')) parts.push('XP');
  if (status.blockers.includes('skills')) parts.push('skills');
  return `Held back by ${parts.join(' and ')}`;
}
