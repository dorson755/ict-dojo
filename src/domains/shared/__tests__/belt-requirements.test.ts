import {
  BELT_REQUIREMENTS,
  MAX_BELT,
  computeBelt,
  countChunksMastered,
  evaluateBeltRequirements,
  getBeltExamTargets,
  getExamSkillIds,
  getMasteryBelt,
  getRequiredLevel,
  getXpBelt,
  meetsLevel,
} from '../belt-requirements';
import type { MasteryLevel } from '../../../types/platform';

const levels: MasteryLevel[] = ['not_started', 'weak', 'developing', 'strong', 'mastered'];

describe('belt requirements', () => {
  describe('meetsLevel', () => {
    it('requires the minimum level or better', () => {
      expect(meetsLevel('not_started', 'developing')).toBe(false);
      expect(meetsLevel('weak', 'developing')).toBe(false);
      expect(meetsLevel('developing', 'developing')).toBe(true);
      expect(meetsLevel('strong', 'developing')).toBe(true);
      expect(meetsLevel(undefined, 'weak')).toBe(false);
    });

    it('is ordered monotonically', () => {
      for (let i = 1; i < levels.length; i++) {
        expect(meetsLevel(levels[i], levels[i - 1])).toBe(true);
        expect(meetsLevel(levels[i - 1], levels[i])).toBe(false);
      }
    });
  });

  describe('getXpBelt', () => {
    it('matches the 5-levels-per-belt ladder', () => {
      expect(getXpBelt(1)).toBe(0);
      expect(getXpBelt(5)).toBe(0);
      expect(getXpBelt(6)).toBe(1);
      expect(getXpBelt(11)).toBe(2);
      expect(getXpBelt(36)).toBe(7);
      expect(getXpBelt(100)).toBe(MAX_BELT);
    });
  });

  describe('getRequiredLevel', () => {
    it('returns the first level of each belt', () => {
      expect(getRequiredLevel(1)).toBe(6);
      expect(getRequiredLevel(2)).toBe(11);
      expect(getRequiredLevel(7)).toBe(36);
    });
  });

  describe('BELT_REQUIREMENTS', () => {
    it('is cumulative', () => {
      for (let belt = 1; belt <= MAX_BELT; belt++) {
        for (const previous of BELT_REQUIREMENTS[belt - 1].skills) {
          const current = BELT_REQUIREMENTS[belt].skills.find((skill) => skill.skillId === previous.skillId);
          expect(current).toBeDefined();
          expect(meetsLevel(current?.minLevel, previous.minLevel)).toBe(true);
        }
      }
    });

    it('never requires more chunks than the previous belt', () => {
      for (let belt = 1; belt <= MAX_BELT; belt++) {
        expect(BELT_REQUIREMENTS[belt].chunksMastered)
          .toBeGreaterThanOrEqual(BELT_REQUIREMENTS[belt - 1].chunksMastered);
      }
    });
  });

  describe('getMasteryBelt', () => {
    it('stays White without any mastery', () => {
      expect(getMasteryBelt({}, 0)).toBe(0);
    });

    it('reaches Yellow when home row is strong and top row developing', () => {
      const mastery = { 'typing-home-row': 'strong', 'typing-top-row': 'developing' } as Record<string, MasteryLevel>;
      expect(getMasteryBelt(mastery, 0)).toBe(1);
    });

    it('holds the belt when a new requirement is unmet', () => {
      const mastery = {
        'typing-home-row': 'strong',
        'typing-top-row': 'developing',
        'typing-bottom-row': 'weak',
      } as Record<string, MasteryLevel>;
      expect(getMasteryBelt(mastery, 50)).toBe(1);
    });

    it('requires mastered chunks for Green and above', () => {
      const yellow = {
        'typing-home-row': 'strong',
        'typing-top-row': 'developing',
      } as Record<string, MasteryLevel>;
      const orange = {
        ...yellow,
        'typing-bottom-row': 'strong',
        'typing-common-words': 'developing',
      } as Record<string, MasteryLevel>;
      const greenSkills = {
        ...orange,
        'typing-common-words': 'strong',
        'typing-sentence-fluency': 'developing',
      } as Record<string, MasteryLevel>;

      expect(getMasteryBelt(greenSkills, 9)).toBe(2);
      expect(getMasteryBelt(greenSkills, 10)).toBe(3);
    });
  });

  describe('computeBelt', () => {
    it('is limited by the lowest gate', () => {
      const mastery = { 'typing-home-row': 'strong', 'typing-top-row': 'developing' } as Record<string, MasteryLevel>;

      // XP and mastery ready, exam not taken.
      expect(computeBelt(6, 0, mastery, 0)).toBe(0);
      // XP and exam ready, mastery not.
      expect(computeBelt(6, 1, {}, 0)).toBe(0);
      // Mastery and exam ready, XP not.
      expect(computeBelt(2, 1, mastery, 0)).toBe(0);
      // All three ready.
      expect(computeBelt(6, 1, mastery, 0)).toBe(1);
    });
  });

  describe('evaluateBeltRequirements', () => {
    it('reports each requirement with its status', () => {
      const checklist = evaluateBeltRequirements(
        1,
        5,
        { 'typing-home-row': 'strong' } as Record<string, MasteryLevel>,
        0
      );
      expect(checklist.xp).toEqual({ currentLevel: 5, requiredLevel: 6, met: false });
      const homeRow = checklist.skills.find((s) => s.skillId === 'typing-home-row');
      const topRow = checklist.skills.find((s) => s.skillId === 'typing-top-row');
      expect(homeRow?.met).toBe(true);
      expect(topRow?.met).toBe(false);
      expect(topRow?.current).toBe('not_started');
      expect(checklist.chunks).toEqual({ current: 0, required: 0, met: true });
    });
  });

  describe('getBeltExamTargets', () => {
    it('scales WPM by belt and keeps accuracy at 90', () => {
      expect(getBeltExamTargets(1)).toEqual({ accuracy: 90, wpm: 20 });
      expect(getBeltExamTargets(7)).toEqual({ accuracy: 90, wpm: 50 });
    });
  });

  describe('getExamSkillIds', () => {
    it('includes the required skills plus chunks', () => {
      const ids = getExamSkillIds(1);
      expect(ids).toContain('typing-home-row');
      expect(ids).toContain('typing-chunks');
    });
  });

  describe('countChunksMastered', () => {
    it('counts only mastered chunk records', () => {
      const masteries = [
        { skill_id: 'chunk:tion', mastery_level: 'mastered' },
        { skill_id: 'chunk:ing', mastery_level: 'strong' },
        { skill_id: 'chunk:th', mastery_level: 'mastered' },
        { skill_id: 'typing-chunks', mastery_level: 'mastered' },
      ];
      expect(countChunksMastered(masteries)).toBe(2);
    });
  });
});
