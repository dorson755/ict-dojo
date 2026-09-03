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
