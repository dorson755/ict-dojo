import { buildWeeklyEmail, weekLabel, type EmailLearner } from '../weekly-email';
import { beltStatus } from '../belt-status';
import { summarizeMastery } from '../mastery-summary';

const CATALOG = new Set(['a', 'b']);

function learner(overrides: Partial<EmailLearner> = {}): EmailLearner {
  return {
    display_name: 'Ada',
    grade_level: 7,
    platform_level: 1,
    streak_count: 0,
    sessionsThisWeek: 0,
    minutesThisWeek: 0,
    averageWpm: 0,
    averageAccuracy: 0,
    wpmTrend: 0,
    accuracyTrend: 0,
    masterySummary: summarizeMastery([], CATALOG),
    weakSkills: 0,
    lastPractice: null,
    status: 'not_started',
    reason: 'No practice recorded',
    belt: beltStatus({ level: 1, examPassed: 0, mastery: [] }),
    hasStarted: false,
    needsAttention: false,
    ...overrides,
  };
}

// Friday 2026-10-16 23:00 at GMT-5 is Saturday 2026-10-17 04:00 UTC.
const SEND_TIME = new Date('2026-10-17T04:00:00Z');

describe('weekLabel', () => {
  it('uses the GMT-5 calendar day, not the UTC one', () => {
    expect(weekLabel(SEND_TIME)).toBe('Oct 16, 2026');
  });
});

describe('buildWeeklyEmail', () => {
  it('summarises activity and lists who needs attention', () => {
    const email = buildWeeklyEmail([
      learner({ display_name: 'Ada', sessionsThisWeek: 3, minutesThisWeek: 20, hasStarted: true, status: 'on_track', reason: 'On track' }),
      learner({ display_name: 'Ben', hasStarted: true, status: 'needs_reinforcement', reason: '2 skills need reinforcement', needsAttention: true }),
      learner({ display_name: 'Cy' }),
    ], SEND_TIME);

    expect(email.subject).toBe('ICT Dojo weekly report: 1 of 3 learners practiced (Oct 16, 2026)');
    expect(email.text).toContain('1 of 3 learners practiced this week');
    expect(email.text).toContain('3 sessions, 20 minutes');
    expect(email.text).toContain('Needs attention (1)');
    expect(email.text).toContain('- Ben: 2 skills need reinforcement');
  });

  it('lists exam-ready learners', () => {
    const ready = beltStatus({
      level: 6,
      examPassed: 0,
      mastery: [{ skill_id: 'typing-home-row', mastery_level: 'strong' }, { skill_id: 'typing-top-row', mastery_level: 'developing' }],
    });
    const email = buildWeeklyEmail([learner({ display_name: 'Sam', belt: ready, hasStarted: true })], SEND_TIME);
    expect(email.text).toContain('Ready for a belt exam (1)');
    expect(email.text).toContain('- Sam');
  });

  it('separates learners who simply did not practice from those needing attention', () => {
    const email = buildWeeklyEmail([
      learner({ display_name: 'Quiet', hasStarted: true, status: 'on_track' }),
      learner({ display_name: 'Stuck', hasStarted: true, status: 'needs_reinforcement', needsAttention: true, reason: '1 skill needs reinforcement' }),
    ], SEND_TIME);
    expect(email.text).toContain('Did not practice this week (1)');
    expect(email.text.split('Did not practice this week')[1]).toContain('Quiet');
    expect(email.text.split('Did not practice this week')[1]).not.toContain('Stuck');
  });

  it('omits empty sections and handles singular wording', () => {
    const email = buildWeeklyEmail([learner({ display_name: 'Ada', sessionsThisWeek: 1, minutesThisWeek: 1, hasStarted: true, status: 'on_track' })], SEND_TIME);
    expect(email.text).toContain('1 session, 1 minute');
    expect(email.text).not.toContain('Needs attention');
    expect(email.text).not.toContain('Ready for a belt exam');
  });

  it('escapes learner names in HTML so a display name cannot inject markup', () => {
    const email = buildWeeklyEmail([
      learner({ display_name: '<img src=x onerror=alert(1)>', hasStarted: true, status: 'needs_reinforcement', needsAttention: true, reason: 'a & b' }),
    ], SEND_TIME);
    expect(email.html).not.toContain('<img');
    expect(email.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(email.html).toContain('a &amp; b');
  });

  it('includes the visual blocks in the HTML and keeps the text version plain', () => {
    const email = buildWeeklyEmail([
      learner({ display_name: 'Ada', sessionsThisWeek: 2, minutesThisWeek: 15, hasStarted: true, averageWpm: 20, averageAccuracy: 90 }),
    ], SEND_TIME);
    expect(email.html).toContain('Class health');
    expect(email.html).toContain('Practice minutes this week');
    expect(email.html).toContain('Belt ranks');
    expect(email.text).not.toContain('<table');
    expect(email.text).toContain('On track: 0');
  });

  it('compares this week with last week and names the most improved learner', () => {
    const day = 86_400_000;
    const at = (daysAgo: number, wpm: number) => ({
      created_at: new Date(SEND_TIME.getTime() - daysAgo * day).toISOString(), wpm, accuracy: 90, durationMs: 60_000,
    });
    const email = buildWeeklyEmail([
      learner({ display_name: 'Ada', hasStarted: true, sessionsThisWeek: 2, minutesThisWeek: 2, sessions: [at(1, 40), at(2, 40), at(8, 20), at(9, 20)] }),
    ], SEND_TIME);
    expect(email.html).toContain('This week vs last week');
    expect(email.html).toContain('Most improved');
    expect(email.text).toContain('Most improved (1)');
    expect(email.text).toContain('- Ada: 20 to 40 WPM (+20)');
  });

  it('omits the comparison sections when learners carry no session history', () => {
    const email = buildWeeklyEmail([learner({ display_name: 'Ada', hasStarted: true })], SEND_TIME);
    expect(email.html).not.toContain('This week vs last week');
    expect(email.html).not.toContain('Most improved');
  });

  it('attaches the same CSV the export produces, named for the GMT-5 date', () => {
    const email = buildWeeklyEmail([learner({ display_name: 'Ada' })], SEND_TIME);
    expect(email.csvFilename).toBe('ict-dojo-weekly-2026-10-16.csv');
    expect(email.csv.split('\n')[0]).toContain('"Learner"');
    expect(email.csv).toContain('"Ada"');
  });

  it('still builds a valid email for an empty roster', () => {
    const email = buildWeeklyEmail([], SEND_TIME);
    expect(email.text).toContain('0 of 0 learners practiced this week');
    expect(email.csv.split('\n')).toHaveLength(1);
  });
});
