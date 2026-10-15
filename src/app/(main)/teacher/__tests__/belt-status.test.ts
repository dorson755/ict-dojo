import { beltBlockerSummary, beltDistribution, beltGateRows, beltStatus } from '../belt-status';

const strong = (skill_id: string) => ({ skill_id, mastery_level: 'strong' });
const developing = (skill_id: string) => ({ skill_id, mastery_level: 'developing' });

const YELLOW_SKILLS = [strong('typing-home-row'), developing('typing-top-row')];

describe('beltStatus', () => {
  it('keeps a brand new learner at White, held back by XP and skills', () => {
    const status = beltStatus({ level: 1, examPassed: undefined, mastery: [] });
    expect(status.belt).toBe(0);
    expect(status.nextBelt).toBe(1);
    expect(status.blockers).toEqual(['xp', 'skills']);
    expect(status.examReady).toBe(false);
    expect(beltBlockerSummary(status)).toBe('Held back by XP and skills');
  });

  it('flags a learner as exam ready once XP and skills cover the next belt', () => {
    const status = beltStatus({ level: 6, examPassed: 0, mastery: YELLOW_SKILLS });
    expect(status.belt).toBe(0);
    expect(status.examReady).toBe(true);
    expect(status.blockers).toEqual(['exam']);
    expect(beltBlockerSummary(status)).toBe('Ready for the promotion exam');
  });

  it('reports a single blocker when only one gate is short', () => {
    const skillsOnly = beltStatus({ level: 6, examPassed: 0, mastery: [strong('typing-home-row')] });
    expect(skillsOnly.blockers).toEqual(['skills']);
    const xpOnly = beltStatus({ level: 3, examPassed: 0, mastery: YELLOW_SKILLS });
    expect(xpOnly.blockers).toEqual(['xp']);
    expect(beltBlockerSummary(xpOnly)).toBe('Held back by XP');
  });

  it('promotes to Yellow after the exam is passed and then looks ahead to Orange', () => {
    const status = beltStatus({ level: 6, examPassed: 1, mastery: YELLOW_SKILLS });
    expect(status.belt).toBe(1);
    expect(status.nextBelt).toBe(2);
    expect(status.blockers).toContain('xp');
    expect(status.blockers).toContain('skills');
    expect(status.checklist?.xp.requiredLevel).toBe(11);
  });

  it('never lets a passed exam outrun XP or mastery', () => {
    const status = beltStatus({ level: 1, examPassed: 3, mastery: [] });
    expect(status.belt).toBe(0);
  });

  it('survives junk input', () => {
    const status = beltStatus({ level: Number.NaN, examPassed: -4, mastery: [] });
    expect(status.belt).toBe(0);
    expect(status.examBelt).toBe(0);
  });
});

describe('beltGateRows', () => {
  const name = (id: string) => id.replace('typing-', '');

  it('lists XP, skills and the exam for the next belt with met flags', () => {
    const status = beltStatus({ level: 6, examPassed: 0, mastery: [strong('typing-home-row')] });
    const rows = beltGateRows(status, name);
    expect(rows.map((row) => row.key)).toEqual(['xp', 'typing-home-row', 'typing-top-row', 'exam']);
    expect(rows.find((row) => row.key === 'xp')).toMatchObject({ label: 'Reach level 6', met: true });
    expect(rows.find((row) => row.key === 'typing-top-row')).toMatchObject({ met: false, detail: 'Now not started' });
    expect(rows.find((row) => row.key === 'exam')?.met).toBe(false);
  });

  it('says the exam is unlocked when only the exam is left', () => {
    const rows = beltGateRows(beltStatus({ level: 6, examPassed: 0, mastery: YELLOW_SKILLS }), name);
    expect(rows.at(-1)?.detail).toBe('Unlocked, not taken yet');
    expect(rows.slice(0, -1).every((row) => row.met)).toBe(true);
  });

  it('adds a chunk row only when the belt requires chunks', () => {
    const orangeSkills = [
      strong('typing-home-row'), strong('typing-top-row'),
      strong('typing-bottom-row'), developing('typing-common-words'),
    ];
    const yellowHolder = beltStatus({ level: 11, examPassed: 1, mastery: orangeSkills });
    expect(yellowHolder.nextBelt).toBe(2);
    expect(beltGateRows(yellowHolder, name).some((row) => row.key === 'chunks')).toBe(false);

    const greenSkills = [...orangeSkills.slice(0, 3), strong('typing-common-words'), developing('typing-sentence-fluency')];
    const status = beltStatus({ level: 16, examPassed: 2, mastery: greenSkills });
    expect(status.nextBelt).toBe(3);
    const chunkRow = beltGateRows(status, name).find((row) => row.key === 'chunks');
    expect(chunkRow).toMatchObject({ label: 'Master 10 chunks', met: false, detail: 'Now 0' });
  });

  it('is empty at the top belt', () => {
    const allMastered = [
      'keyboard-familiarity', 'home-row', 'top-row', 'bottom-row', 'common-words', 'sentence-fluency',
      'capitalization', 'punctuation', 'numbers', 'coding-syntax',
    ].map((id) => ({ skill_id: `typing-${id}`, mastery_level: 'mastered' }));
    const chunks = Array.from({ length: 63 }, (_, index) => ({ skill_id: `chunk:${index}`, mastery_level: 'mastered' }));
    const status = beltStatus({ level: 36, examPassed: 7, mastery: [...allMastered, ...chunks] });
    expect(status.belt).toBe(7);
    expect(status.blockers).toEqual(['max']);
    expect(beltGateRows(status, name)).toEqual([]);
  });
});

describe('beltDistribution', () => {
  it('lists White and the next belt even when everyone is White', () => {
    expect(beltDistribution([0, 0, 0])).toEqual([
      { belt: 0, count: 3 },
      { belt: 1, count: 0 },
    ]);
  });

  it('extends one belt past the highest held and counts each belt', () => {
    expect(beltDistribution([0, 1, 1, 2])).toEqual([
      { belt: 0, count: 1 },
      { belt: 1, count: 2 },
      { belt: 2, count: 1 },
      { belt: 3, count: 0 },
    ]);
  });

  it('handles an empty roster', () => {
    expect(beltDistribution([])).toEqual([
      { belt: 0, count: 0 },
      { belt: 1, count: 0 },
    ]);
  });
});
