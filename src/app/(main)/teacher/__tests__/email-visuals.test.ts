import {
  activityBars,
  activityBarsHtml,
  beltLadderHtml,
  classAverages,
  emailVisualsHtml,
  speedAccuracyHtml,
  statusBarHtml,
  statusSegments,
  type VisualLearner,
} from '../email-visuals';

function learner(overrides: Partial<VisualLearner> = {}): VisualLearner {
  return {
    display_name: 'Ada',
    status: 'on_track',
    minutesThisWeek: 0,
    sessionsThisWeek: 0,
    averageWpm: 0,
    averageAccuracy: 0,
    wpmTrend: 0,
    accuracyTrend: 0,
    hasStarted: true,
    belt: { belt: 0, blockers: ['xp', 'skills'], examReady: false, nextBelt: 1 },
    ...overrides,
  };
}

describe('statusSegments', () => {
  it('counts each status and keeps percentages summing to 100', () => {
    const segments = statusSegments([
      { status: 'on_track' }, { status: 'on_track' }, { status: 'inactive' },
    ]);
    expect(segments.map((segment) => segment.count)).toEqual([2, 0, 1, 0]);
    expect(segments.reduce((sum, segment) => sum + segment.percent, 0)).toBe(100);
  });

  it('still sums to 100 when thirds do not divide evenly', () => {
    const segments = statusSegments([
      { status: 'on_track' }, { status: 'needs_reinforcement' }, { status: 'inactive' },
    ]);
    expect(segments.reduce((sum, segment) => sum + segment.percent, 0)).toBe(100);
  });

  it('returns zero percentages for an empty roster', () => {
    expect(statusSegments([]).every((segment) => segment.percent === 0 && segment.count === 0)).toBe(true);
  });
});

describe('statusBarHtml', () => {
  it('draws only segments that have learners and lists every status in the legend', () => {
    const html = statusBarHtml([learner({ status: 'on_track' }), learner({ status: 'inactive' })]);
    expect(html.match(/height:18px/g)).toHaveLength(2);
    expect(html).toContain('On track 1');
    expect(html).toContain('Struggling 0');
  });

  it('returns nothing for an empty roster', () => {
    expect(statusBarHtml([])).toBe('');
  });
});

describe('activityBars', () => {
  it('sorts by minutes and scales to the busiest learner', () => {
    const bars = activityBars([
      learner({ display_name: 'Low', minutesThisWeek: 5 }),
      learner({ display_name: 'High', minutesThisWeek: 20 }),
    ]);
    expect(bars.map((bar) => bar.name)).toEqual(['High', 'Low']);
    expect(bars[0].percent).toBe(100);
    expect(bars[1].percent).toBe(25);
  });

  it('keeps a visible sliver for small nonzero values and none for zero', () => {
    const bars = activityBars([
      learner({ display_name: 'Big', minutesThisWeek: 1000 }),
      learner({ display_name: 'Tiny', minutesThisWeek: 1 }),
      learner({ display_name: 'None', minutesThisWeek: 0 }),
    ]);
    expect(bars[1].percent).toBe(2);
    expect(bars[2].percent).toBe(0);
  });

  it('limits to the top ten', () => {
    const many = Array.from({ length: 15 }, (_, index) => learner({ display_name: `L${index}`, minutesThisWeek: index }));
    expect(activityBars(many)).toHaveLength(10);
  });
});

describe('activityBarsHtml', () => {
  it('says so plainly when nobody practiced', () => {
    expect(activityBarsHtml([learner(), learner()])).toContain('No practice recorded this week.');
  });

  it('escapes learner names', () => {
    const html = activityBarsHtml([learner({ display_name: '<b>x</b>', minutesThisWeek: 3 })]);
    expect(html).not.toContain('<b>x</b>');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});

describe('beltLadderHtml', () => {
  it('shows a cell per belt through one past the highest held, with block counts', () => {
    const html = beltLadderHtml([
      learner({ belt: { belt: 0, blockers: ['xp', 'skills'], examReady: false, nextBelt: 1 } }),
      learner({ belt: { belt: 0, blockers: ['skills'], examReady: false, nextBelt: 1 } }),
      learner({ belt: { belt: 1, blockers: ['exam'], examReady: true, nextBelt: 2 } }),
    ]);
    expect(html).toContain('White');
    expect(html).toContain('Yellow');
    expect(html).toContain('Orange');
    expect(html).not.toContain('Green');
    expect(html).toContain('Held back by XP: 1');
    expect(html).toContain('Held back by skills: 2');
    expect(html).toContain('Exam ready: 1');
  });

  it('does not count top-belt learners as held back', () => {
    const html = beltLadderHtml([learner({ belt: { belt: 7, blockers: ['max'], examReady: false, nextBelt: null } })]);
    expect(html).toContain('Held back by XP: 0');
    expect(html).toContain('Exam ready: 0');
  });
});

describe('classAverages', () => {
  it('averages only learners with a reading and ignores not-started ones', () => {
    const averages = classAverages([
      learner({ averageWpm: 10, averageAccuracy: 80, wpmTrend: 2, accuracyTrend: -4 }),
      learner({ averageWpm: 20, averageAccuracy: 90, wpmTrend: 4, accuracyTrend: -2 }),
      learner({ averageWpm: 0, averageAccuracy: 0 }),
      learner({ hasStarted: false, averageWpm: 99, averageAccuracy: 99 }),
    ]);
    expect(averages).toEqual({ wpm: 15, accuracy: 85, wpmTrend: 3, accuracyTrend: -3 });
  });

  it('returns nulls when nobody has a reading', () => {
    expect(classAverages([learner()])).toEqual({ wpm: null, accuracy: null, wpmTrend: null, accuracyTrend: null });
  });
});

describe('speedAccuracyHtml', () => {
  it('colors an improvement green with an up arrow and a drop red with a down arrow', () => {
    const html = speedAccuracyHtml([learner({ averageWpm: 12, averageAccuracy: 90, wpmTrend: 3, accuracyTrend: -5 })]);
    expect(html).toContain('&#9650; 3 WPM');
    expect(html).toContain('&#9660; 5 pts');
    expect(html).toContain('12');
    expect(html).toContain('90%');
  });

  it('is omitted when there is nothing to average', () => {
    expect(speedAccuracyHtml([learner()])).toBe('');
  });
});

describe('emailVisualsHtml', () => {
  it('uses only inline-styled tables, with no SVG, scripts, images or style blocks', () => {
    const html = emailVisualsHtml([
      learner({ minutesThisWeek: 10, averageWpm: 15, averageAccuracy: 88, wpmTrend: 1, accuracyTrend: 1 }),
    ]);
    expect(html).not.toMatch(/<svg|<script|<img|<style|<link/i);
    expect(html).toContain('<table');
  });

  it('is empty for an empty roster', () => {
    expect(emailVisualsHtml([])).toBe('');
  });
});
