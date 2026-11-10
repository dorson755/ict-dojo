import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { subjectsFor } from '@/domains/exams/catalog';
import {
  getStudySubject,
  getStudySession,
  studySubjects,
  KEYBOARDING_VIDEOS,
  keyboardingLibrary,
} from '../catalog';

describe('study library catalog', () => {
  it.each(['bgcse', 'bjc'] as const)(
    'includes every %s subject without conflating qualifications',
    (qualification) => {
      expect(studySubjects(qualification).map((subject) => subject.id)).toEqual(
        subjectsFor(qualification).map((subject) => subject.id),
      );
      for (const subject of subjectsFor(qualification)) {
        expect(getStudySubject(qualification, subject.id)?.name).toBe(subject.name);
      }
    },
  );

  it('publishes only the supplied Keyboarding course', () => {
    const available = [...studySubjects('bgcse'), ...studySubjects('bjc')].filter(
      (subject) => subject.sessionCount > 0,
    );
    expect(available).toEqual([
      expect.objectContaining({ qualification: 'bgcse', id: 'keyboarding', sessionCount: 25 }),
    ]);
    expect(getStudySubject('bjc', 'mathematics')?.library).toBeUndefined();
    expect(getStudySubject('bgcse', 'keyboarding')?.library).toBe(keyboardingLibrary);
  });

  it('preserves all 25 student sessions and 26 separately numbered teacher lessons', () => {
    expect(keyboardingLibrary.sessions.map((session) => session.number)).toEqual(
      Array.from({ length: 25 }, (_, i) => i + 1),
    );
    expect(keyboardingLibrary.teacherLessons).toHaveLength(26);
    expect(keyboardingLibrary.sessions[0].title).toBe('Introduction to the Online Typing Platform');
    expect(keyboardingLibrary.sessions[24].title).toBe('Final Exam Simulation');
    for (const session of keyboardingLibrary.sessions) {
      expect(getStudySession('bgcse', 'keyboarding', session.slug)).toBe(session);
      expect(session.sections.map((section) => section.title)).toEqual(
        expect.arrayContaining(['Big idea', 'Key points', 'Check yourself']),
      );
      for (const section of session.sections)
        expect(section.text.trim().length).toBeGreaterThan(10);
      expect(KEYBOARDING_VIDEOS[session.number]?.length).toBeGreaterThan(0);
      for (const video of KEYBOARDING_VIDEOS[session.number])
        expect(video.id).toMatch(/^[\w-]{11}$/);
    }
  });

  it.each([
    ['unknown', 'keyboarding', 'session-1'],
    ['bjc', 'keyboarding', 'session-1'],
    ['bgcse', 'mathematics', 'session-1'],
    ['bgcse', 'keyboarding', 'session-0'],
    ['bgcse', 'keyboarding', 'session-26'],
    ['bgcse', 'keyboarding', 'session-01'],
    ['__proto__', 'keyboarding', 'session-1'],
  ])('rejects unavailable or malformed routes: %s/%s/%s', (qualification, subject, session) => {
    expect(getStudySession(qualification, subject, session)).toBeUndefined();
  });

  it('ships complete, licensed, locally hosted images for every gallery', () => {
    const withImages = keyboardingLibrary.sessions.filter((session) => session.images?.length);
    expect(withImages.map((session) => session.number)).toEqual([3, 16]);
    for (const session of withImages) {
      expect(session.imagesTitle).toBeTruthy();
      for (const image of session.images!) {
        expect(image.src).toMatch(/^\/study\/images\/[\w.-]+$/);
        const fileExists = existsSync(join(process.cwd(), 'public', image.src));
        if (!fileExists) throw new Error(`${image.src} must exist in public/`);
        expect(fileExists).toBe(true);
        expect(image.alt.length).toBeGreaterThan(40);
        expect(image.caption.length).toBeGreaterThan(40);
        expect(image.credit.length).toBeGreaterThan(5);
        if (image.creditUrl)
          expect(image.creditUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
      }
    }
  });

  it('clarifies classroom scoring and full-paper simulation limits', () => {
    expect(JSON.stringify(keyboardingLibrary.sessions[17])).toContain(
      'not a verified official BGCSE formula',
    );
    expect(JSON.stringify(keyboardingLibrary.sessions[19])).toContain('not a complete Paper 1');
    for (const number of [23, 25])
      expect(JSON.stringify(keyboardingLibrary.sessions[number - 1])).toContain(
        'separate extended sitting',
      );
    const ledger = keyboardingLibrary.sessions[8].sections.find((section) =>
      section.title.startsWith('Worked example:'),
    )!;
    expect(ledger.text).toContain('line amounts, not unit prices');
    expect(ledger.text).toContain('$66.25');
  });
});
