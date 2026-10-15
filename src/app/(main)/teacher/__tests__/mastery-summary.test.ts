import { masteryExplanation, summarizeMastery } from '../mastery-summary';
import { masteryLevelName } from '@/domains/shared/mastery-labels';

const CATALOG = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']);
const row = (skill_id: string, mastery_score: number, mastery_level: string, practice_count = 1) => ({
  skill_id, mastery_score, mastery_level, practice_count,
});

describe('summarizeMastery', () => {
  it('reports coverage separately from the average, as in the Faith Kemp case', () => {
    const summary = summarizeMastery([
      row('a', 72, 'strong'), row('b', 55, 'developing'), row('c', 76, 'strong'),
      row('d', 67, 'developing'), row('e', 78, 'strong'),
    ], CATALOG);
    expect(summary).toEqual({ assessed: 5, total: 10, secure: 3, averageScore: 70, coverage: 50 });
  });

  it('leaves unassessed skills out of the average but shows the gap in coverage', () => {
    const summary = summarizeMastery([row('a', 80, 'strong')], CATALOG);
    expect(summary.averageScore).toBe(80);
    expect(summary.coverage).toBe(10);
  });

  it('returns a null average when nothing is assessed', () => {
    const summary = summarizeMastery([], CATALOG);
    expect(summary).toMatchObject({ assessed: 0, averageScore: null, coverage: 0, secure: 0 });
  });

  it('ignores retired skills, per-chunk rows and zero scores', () => {
    const summary = summarizeMastery([
      row('a', 60, 'developing'), row('retired-skill', 90, 'mastered'),
      row('chunk:x', 90, 'mastered'), row('b', 0, 'not_started', 0),
    ], CATALOG);
    expect(summary.assessed).toBe(1);
    expect(summary.secure).toBe(0);
  });

  it('counts mastered as secure alongside strong', () => {
    const summary = summarizeMastery([row('a', 95, 'mastered'), row('b', 75, 'strong'), row('c', 50, 'developing')], CATALOG);
    expect(summary.secure).toBe(2);
  });
});

describe('wording', () => {
  it('names levels and falls back safely', () => {
    expect(masteryLevelName('developing')).toBe('Developing');
    expect(masteryLevelName('nonsense')).toBe('Not started');
  });

  it('says what the average covers', () => {
    const text = masteryExplanation({ assessed: 5, total: 10, secure: 3, averageScore: 70, coverage: 50 });
    expect(text).toBe('Assessed on 5 of 10 skills. 3 strong or better. Average score 70 out of 100 across the assessed skills only.');
  });

  it('handles nothing assessed', () => {
    expect(masteryExplanation(summarizeMastery([], CATALOG))).toBe('No skills assessed yet.');
  });
});
