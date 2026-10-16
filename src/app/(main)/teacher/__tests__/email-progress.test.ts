import {
  delta,
  mostImprovedHtml,
  mostImprovedText,
  progressBlocks,
  weekComparisonHtml,
  weekComparisonText,
} from '../email-progress';
import { compareWeeks, type ComparableLearner } from '../week-comparison';

const DAY = 86_400_000;
const NOW = new Date('2026-10-17T04:00:00Z').getTime();

function session(daysAgo: number, wpm = 20, accuracy = 90, durationMs = 60_000) {
  return { created_at: new Date(NOW - daysAgo * DAY).toISOString(), wpm, accuracy, durationMs };
}

function learner(name: string, sessions: ReturnType<typeof session>[], extra: Partial<ComparableLearner> = {}): ComparableLearner {
  return { display_name: name, sessions, ...extra };
}

describe('delta', () => {
  it('reports direction and signed change', () => {
    expect(delta(10, 4)).toEqual({ change: 6, direction: 'up' });
    expect(delta(4, 10)).toEqual({ change: -6, direction: 'down' });
    expect(delta(5, 5)).toEqual({ change: 0, direction: 'flat' });
  });

  it('has no direction when either side is missing', () => {
    expect(delta(null, 5)).toEqual({ change: null, direction: 'none' });
    expect(delta(5, null)).toEqual({ change: null, direction: 'none' });
  });
});

describe('weekComparisonHtml', () => {
  const learners = [
    learner('A', [session(1, 30, 95, 120_000), session(2, 30, 95, 120_000), session(9, 20, 85, 60_000)]),
  ];

  it('shows both weeks with green up arrows for gains and red down arrows for drops', () => {
    const html = weekComparisonHtml(compareWeeks(learners, NOW));
    expect(html).toContain('This week vs last week');
    expect(html).toContain('&#9650; 1');
    expect(html).toContain('&#9650; 10');
    const dropped = weekComparisonHtml(compareWeeks([learner('A', [session(1, 10), session(9, 20), session(10, 20)])], NOW));
    expect(dropped).toContain('&#9660;');
  });

  it('is omitted when neither week has any sessions', () => {
    expect(weekComparisonHtml(compareWeeks([learner('A', [])], NOW))).toBe('');
    expect(weekComparisonText(compareWeeks([learner('A', [])], NOW))).toEqual([]);
  });

  it('shows n/a rather than a fake change when last week has no readings', () => {
    const html = weekComparisonHtml(compareWeeks([learner('A', [session(1, 30)])], NOW));
    expect(html).toContain('n/a');
  });

  it('warns when history is truncated', () => {
    const html = weekComparisonHtml(compareWeeks([learner('A', [session(1)], { historyTruncated: true })], NOW));
    expect(html).toContain('last week may be undercounted');
    expect(weekComparisonText(compareWeeks([learner('A', [session(1)], { historyTruncated: true })], NOW)).join('\n'))
      .toContain('last week may be undercounted');
  });

  it('does not warn when history is complete', () => {
    expect(weekComparisonHtml(compareWeeks(learners, NOW))).not.toContain('undercounted');
  });

  it('writes the plain text rows with last week and the change', () => {
    const text = weekComparisonText(compareWeeks(learners, NOW)).join('\n');
    expect(text).toContain('- Sessions: 2 (last week 1, +1)');
  });
});

describe('mostImproved blocks', () => {
  const improvers = [{ name: 'Ada', wpmChange: 12, thisWpm: 32, lastWpm: 20, sessionsThisWeek: 3 }];

  it('renders the name, both speeds and the gain', () => {
    const html = mostImprovedHtml(improvers);
    expect(html).toContain('Most improved');
    expect(html).toContain('Ada');
    expect(html).toContain('20 &rarr; 32 WPM');
    expect(html).toContain('&#9650; 12');
    expect(mostImprovedText(improvers).join('\n')).toContain('- Ada: 20 to 32 WPM (+12)');
  });

  it('is omitted when nobody qualifies', () => {
    expect(mostImprovedHtml([])).toBe('');
    expect(mostImprovedText([])).toEqual([]);
  });

  it('escapes learner names', () => {
    const html = mostImprovedHtml([{ ...improvers[0], name: '<script>alert(1)</script>' }]);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('progressBlocks', () => {
  it('combines the comparison and the most improved list', () => {
    const blocks = progressBlocks([
      learner('Ada', [session(1, 40), session(2, 40), session(8, 20), session(9, 20)]),
    ], NOW);
    expect(blocks.html).toContain('This week vs last week');
    expect(blocks.html).toContain('Most improved');
    expect(blocks.text.join('\n')).toContain('Most improved (1)');
  });

  it('returns nothing for a roster with no sessions', () => {
    expect(progressBlocks([learner('Ada', [])], NOW)).toEqual({ html: '', text: [] });
  });

  it('uses only inline-styled tables, with no SVG, scripts, images or style blocks', () => {
    const { html } = progressBlocks([
      learner('Ada', [session(1, 40), session(2, 40), session(8, 20), session(9, 20)]),
    ], NOW);
    expect(html).not.toMatch(/<svg|<script|<img|<style|<link/i);
  });
});
