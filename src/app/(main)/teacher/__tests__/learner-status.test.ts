import {
  averageCatalogMastery,
  classifyLearner,
  countWeakSkills,
  STATUS_PRIORITY,
  type MasteryRow,
} from '../learner-status';

const catalog = new Set(['typing-home-row', 'typing-top-row', 'typing-chunks']);

const row = (skill_id: string, mastery_score: number, mastery_level = 'strong'): MasteryRow => ({
  skill_id,
  mastery_score,
  mastery_level,
  practice_count: 1,
});

describe('averageCatalogMastery', () => {
  it('ignores retired ids and per-chunk rows', () => {
    const rows = [
      row('typing-home-row', 80),
      row('typing-top-row', 60),
      row('00000000-0000-0000-0000-000000000001', 99),
      row('chunk:tion', 85),
    ];
    expect(averageCatalogMastery(rows, catalog)).toBe(70);
  });

  it('returns 0 when nothing in the catalog has been practiced', () => {
    expect(averageCatalogMastery([row('00000000-0000-0000-0000-000000000001', 83)], catalog)).toBe(0);
    expect(averageCatalogMastery([], catalog)).toBe(0);
  });

  it('counts the combined chunks skill', () => {
    expect(averageCatalogMastery([row('typing-chunks', 40)], catalog)).toBe(40);
  });
});

describe('countWeakSkills', () => {
  it('only counts weak catalog skills', () => {
    const rows = [
      row('typing-home-row', 30, 'weak'),
      row('chunk:th', 10, 'weak'),
      row('typing-top-row', 80),
    ];
    expect(countWeakSkills(rows, catalog)).toBe(1);
  });
});

describe('classifyLearner', () => {
  it('marks learners with no practice as not started', () => {
    expect(classifyLearner({ hasStarted: false, daysSincePractice: null, weakSkills: 0 }).status).toBe('not_started');
  });

  it('puts struggling ahead of inactive', () => {
    const result = classifyLearner({ hasStarted: true, daysSincePractice: 30, weakSkills: 2 });
    expect(result.status).toBe('needs_reinforcement');
    expect(result.reason).toBe('2 skills need reinforcement');
  });

  it('uses singular wording for one weak skill', () => {
    expect(classifyLearner({ hasStarted: true, daysSincePractice: 1, weakSkills: 1 }).reason).toBe('1 skill needs reinforcement');
  });

  it('flags a learner who has gone quiet for more than a week', () => {
    const result = classifyLearner({ hasStarted: true, daysSincePractice: 28, weakSkills: 0 });
    expect(result.status).toBe('inactive');
    expect(result.reason).toBe('Last practiced 28 days ago');
  });

  it('treats exactly seven days as still on track', () => {
    expect(classifyLearner({ hasStarted: true, daysSincePractice: 7, weakSkills: 0 }).status).toBe('on_track');
  });

  it('is on track after recent practice with no weak skills', () => {
    expect(classifyLearner({ hasStarted: true, daysSincePractice: 2, weakSkills: 0 }).status).toBe('on_track');
  });

  it('orders struggling first and not started last', () => {
    expect(STATUS_PRIORITY.needs_reinforcement).toBeLessThan(STATUS_PRIORITY.inactive);
    expect(STATUS_PRIORITY.inactive).toBeLessThan(STATUS_PRIORITY.on_track);
    expect(STATUS_PRIORITY.on_track).toBeLessThan(STATUS_PRIORITY.not_started);
  });
});
