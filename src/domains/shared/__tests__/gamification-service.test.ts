import { GamificationService } from '../gamification-service';
import { TypingSessionResult } from '@/domains/typing/types';

describe('GamificationService', () => {
  let service: GamificationService;

  beforeEach(() => {
    service = new GamificationService();
  });

  const mockResult = (overrides: Partial<TypingSessionResult> = {}): TypingSessionResult => ({
    wpm: 30,
    accuracy: 90,
    charsAttempted: 100,
    charsCorrect: 90,
    charsIncorrect: 10,
    backspaces: 5,
    durationMs: 60000,
    passageLength: 100,
    difficultyScore: 1,
    errorLocations: [],
    keyPairErrors: [],
    hesitationEvents: [],
    compositeScore: 75,
    isValid: true,
    keystrokes: [],
    ...overrides,
  });

  describe('calculateSessionXp', () => {
    it('awards base XP for completing a session', () => {
      const result = mockResult();
      const award = service.calculateSessionXp(result, 1);
      expect(award.xpGained).toBeGreaterThan(50);
      expect(award.breakdown.base).toBe(50);
    });

    it('rewards accuracy more than speed', () => {
      const highAccuracy = service.calculateSessionXp(mockResult({ wpm: 20, accuracy: 95 }), 1);
      const highSpeed = service.calculateSessionXp(mockResult({ wpm: 60, accuracy: 50 }), 1);

      // Accuracy-focused session should earn more XP than speed-focused
      expect(highAccuracy.xpGained).toBeGreaterThan(highSpeed.xpGained);
    });

    it('caps speed bonus at 60 WPM', () => {
      const capped = service.calculateSessionXp(mockResult({ wpm: 100, accuracy: 90 }), 1);
      const at60 = service.calculateSessionXp(mockResult({ wpm: 60, accuracy: 90 }), 1);

      expect(capped.breakdown.speed).toBe(at60.breakdown.speed);
    });

    it('adds difficulty bonus', () => {
      const easy = service.calculateSessionXp(mockResult(), 1);
      const hard = service.calculateSessionXp(mockResult(), 3);

      expect(hard.xpGained).toBeGreaterThan(easy.xpGained);
      expect(hard.breakdown.difficulty).toBe(30);
      expect(easy.breakdown.difficulty).toBe(10);
    });
  });

  describe('calculateDiagnosticXp', () => {
    it('awards 75 XP per valid stage', () => {
      expect(service.calculateDiagnosticXp(3)).toBe(225);
      expect(service.calculateDiagnosticXp(5)).toBe(375);
      expect(service.calculateDiagnosticXp(0)).toBe(0);
    });
  });

  describe('calculateLevelUpdate', () => {
    it('starts at level 1 with 0 XP', () => {
      const update = service.calculateLevelUpdate(0, 1, 0);
      expect(update.newLevel).toBe(1);
      expect(update.leveledUp).toBe(false);
    });

    it('levels up at 1000 XP', () => {
      const update = service.calculateLevelUpdate(950, 1, 100);
      expect(update.newTotalXp).toBe(1050);
      expect(update.newLevel).toBe(2);
      expect(update.leveledUp).toBe(true);
      expect(update.levelsGained).toBe(1);
    });

    it('handles multiple level gains', () => {
      const update = service.calculateLevelUpdate(0, 1, 2500);
      expect(update.newLevel).toBe(3);
      expect(update.leveledUp).toBe(true);
      expect(update.levelsGained).toBe(2);
    });

    it('does not level up when below threshold', () => {
      const update = service.calculateLevelUpdate(500, 1, 400);
      expect(update.newTotalXp).toBe(900);
      expect(update.newLevel).toBe(1);
      expect(update.leveledUp).toBe(false);
    });
  });

  describe('calculateStreakUpdate', () => {
    it('starts a new streak at 1 for first practice', () => {
      const update = service.calculateStreakUpdate(null, 0);
      expect(update.streak).toBe(1);
      expect(update.continued).toBe(false);
      expect(update.reset).toBe(false);
    });

    it('does not change streak if already practiced today', () => {
      const today = new Date().toISOString().split('T')[0];
      const update = service.calculateStreakUpdate(today, 5);
      expect(update.streak).toBe(5);
      expect(update.continued).toBe(true);
    });

    it('increments streak when practicing consecutive day', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const update = service.calculateStreakUpdate(yesterdayStr, 3);
      expect(update.streak).toBe(4);
      expect(update.continued).toBe(true);
      expect(update.reset).toBe(false);
    });

    it('resets streak to 1 after a gap', () => {
      const oldDate = '2024-01-01';
      const update = service.calculateStreakUpdate(oldDate, 10);
      expect(update.streak).toBe(1);
      expect(update.continued).toBe(false);
      expect(update.reset).toBe(true);
    });
  });
});
