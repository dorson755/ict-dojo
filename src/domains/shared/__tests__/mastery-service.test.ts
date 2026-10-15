import { MasteryService } from '../mastery-service';
import { SkillMastery } from '@/types/platform';

describe('MasteryService', () => {
  let service: MasteryService;

  beforeEach(() => {
    service = new MasteryService();
  });

  describe('getMasteryLevelFromScore', () => {
    it('returns not_started for 0', () => {
      expect(service.getMasteryLevelFromScore(0)).toBe('not_started');
    });

    it('returns weak for < 40', () => {
      expect(service.getMasteryLevelFromScore(39)).toBe('weak');
      expect(service.getMasteryLevelFromScore(10)).toBe('weak');
    });

    it('returns developing for 40-69', () => {
      expect(service.getMasteryLevelFromScore(40)).toBe('developing');
      expect(service.getMasteryLevelFromScore(69)).toBe('developing');
    });

    it('returns strong for 70-89', () => {
      expect(service.getMasteryLevelFromScore(70)).toBe('strong');
      expect(service.getMasteryLevelFromScore(89)).toBe('strong');
    });

    it('returns mastered for >= 90', () => {
      expect(service.getMasteryLevelFromScore(90)).toBe('mastered');
      expect(service.getMasteryLevelFromScore(100)).toBe('mastered');
    });
  });

  describe('processAttempt', () => {
    it('handles first attempt perfectly', () => {
      const result = service.processAttempt(undefined, 'student-1', 'skill-1', 85);
      expect(result.newScore).toBe(85);
      expect(result.newLevel).toBe('strong');
    });

    it('never marks a skill mastered from a single perfect session', () => {
      const result = service.processAttempt(undefined, 'student-1', 'skill-1', 100);
      expect(result.newScore).toBe(85);
      expect(result.newLevel).toBe('strong');
    });

    it('reaches mastered after a second consistent perfect session', () => {
      const first = service.processAttempt(undefined, 'student-1', 'skill-1', 100);
      const currentMastery = {
        mastery_score: first.newScore,
        practice_count: 1,
      } as SkillMastery;

      // practiceCount = 1 -> alpha = 0.35: (0.35 * 100) + (0.65 * 85) = 90.25
      const second = service.processAttempt(currentMastery, 'student-1', 'skill-1', 100);
      expect(second.newScore).toBe(90.25);
      expect(second.newLevel).toBe('mastered');
    });

    it('uses EMA to blend old and new scores', () => {
      const currentMastery = {
        mastery_score: 80,
        practice_count: 3,
      } as SkillMastery;

      // With practice_count = 3, alpha should be 0.4 - (3 * 0.05) = 0.25
      // New score: (0.25 * 100) + (0.75 * 80) = 25 + 60 = 85
      const result = service.processAttempt(currentMastery, 'student-1', 'skill-1', 100);
      expect(result.newScore).toBe(85);
      expect(result.newLevel).toBe('strong');
    });

    describe('speed gate', () => {
      it('holds a slow learner at developing even with a high score', () => {
        const result = service.processAttempt(undefined, 'student-1', 'skill-1', 85, 8);
        expect(result.newScore).toBe(85);
        expect(result.newLevel).toBe('developing');
      });

      it('allows strong at the minimum speed', () => {
        const result = service.processAttempt(undefined, 'student-1', 'skill-1', 85, 20);
        expect(result.newLevel).toBe('strong');
      });

      it('holds a mid-speed learner at strong even with a mastered-level score', () => {
        const current = { mastery_score: 85, practice_count: 1 } as SkillMastery;
        const result = service.processAttempt(current, 'student-1', 'skill-1', 100, 25);
        expect(result.newScore).toBe(90.25);
        expect(result.newLevel).toBe('strong');
      });

      it('allows mastered at the mastered speed', () => {
        const current = { mastery_score: 85, practice_count: 1 } as SkillMastery;
        const result = service.processAttempt(current, 'student-1', 'skill-1', 100, 30);
        expect(result.newLevel).toBe('mastered');
      });

      it('never touches the score, only the level', () => {
        const slow = service.processAttempt(undefined, 'student-1', 'skill-1', 80, 5);
        const unmeasured = service.processAttempt(undefined, 'student-1', 'skill-1', 80);
        expect(slow.newScore).toBe(unmeasured.newScore);
      });

      it('does not raise a level that the score has not earned', () => {
        const result = service.processAttempt(undefined, 'student-1', 'skill-1', 30, 60);
        expect(result.newLevel).toBe('weak');
      });

      it('ignores the gate when no speed is supplied', () => {
        const result = service.processAttempt(undefined, 'student-1', 'skill-1', 85);
        expect(result.newLevel).toBe('strong');
      });
    });

    describe('capLevelBySpeed', () => {
      it('exposes the thresholds', () => {
        expect(service.capLevelBySpeed('mastered', 29.9)).toBe('strong');
        expect(service.capLevelBySpeed('mastered', 30)).toBe('mastered');
        expect(service.capLevelBySpeed('strong', 19.9)).toBe('developing');
        expect(service.capLevelBySpeed('developing', 1)).toBe('developing');
        expect(service.capLevelBySpeed('weak', 1)).toBe('weak');
      });

      it('treats a missing or invalid speed as no information', () => {
        expect(service.capLevelBySpeed('mastered', undefined)).toBe('mastered');
        expect(service.capLevelBySpeed('strong', Number.NaN)).toBe('strong');
      });
    });

    it('caps alpha at 0.1 for many practice counts', () => {
      const currentMastery = {
        mastery_score: 90,
        practice_count: 20,
      } as SkillMastery;

      // alpha should be 0.1
      // New score: (0.1 * 50) + (0.9 * 90) = 5 + 81 = 86
      const result = service.processAttempt(currentMastery, 'student-1', 'skill-1', 50);
      expect(result.newScore).toBe(86);
      expect(result.newLevel).toBe('strong');
    });
  });
});
