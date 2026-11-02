import {
  coverageStatus,
  EXAM_SUBJECTS,
  examYears,
  MAX_PAPER_BYTES,
  parsePaperMetadata,
  validExamYear,
  validSubmissionId,
} from '../catalog';
import { ExamError, examAction, unwrapExamResult } from '../results';
import type { ExamCoverage } from '../catalog';

const metadata = {
  subject: 'mathematics',
  year: 2020,
  component: ' Paper 1, May/June ',
  kind: 'Question paper',
  notes: '',
  filename: 'maths.pdf',
  size: 100,
  permission: true,
};
it('contains exactly the 26 supplied subjects with unique IDs', () => {
  expect(EXAM_SUBJECTS).toHaveLength(26);
  expect(new Set(EXAM_SUBJECTS.map((subject) => subject.id)).size).toBe(26);
  expect(new Set(EXAM_SUBJECTS.map((subject) => subject.group)).size).toBe(7);
});
it('includes every year from 1999 to the current year, newest first', () => {
  expect(examYears(2026)).toHaveLength(28);
  expect(examYears(2026)[0]).toBe(2026);
  expect(examYears(2026).at(-1)).toBe(1999);
  expect(validExamYear(1998)).toBe(false);
  expect(validExamYear(new Date().getUTCFullYear() + 1)).toBe(false);
  expect(validExamYear('2020')).toBe(false);
});
it('requires explicit completion, not just an accepted component', () => {
  const row: ExamCoverage = {
    subject: 'mathematics',
    year: 2020,
    version: 1,
    pending: 1,
    accepted: [],
    complete: false,
  };
  expect(coverageStatus()).toBe('needed');
  expect(coverageStatus(row)).toBe('review');
  row.accepted.push({ id: 'a', component: 'Paper 1', kind: 'Question paper' });
  expect(coverageStatus(row)).toBe('partial');
  row.complete = true;
  expect(coverageStatus(row)).toBe('collected');
});
it('normalizes valid metadata without trusting storage paths or identities', () => {
  const result = parsePaperMetadata({ ...metadata, owner: 'someone', objectKey: 'public/file' });
  expect(result.component).toBe('Paper 1, May/June');
  expect(result).not.toHaveProperty('owner');
  expect(result).not.toHaveProperty('objectKey');
});
it.each([
  null,
  {},
  { ...metadata, permission: false },
  { ...metadata, subject: '__proto__' },
  { ...metadata, year: 1998 },
  { ...metadata, component: '' },
  { ...metadata, component: '\nPaper' },
  { ...metadata, notes: 'x'.repeat(1001) },
  { ...metadata, filename: '../x.pdf' },
  { ...metadata, filename: 'x.svg' },
  { ...metadata, size: MAX_PAPER_BYTES + 1 },
  { ...metadata, size: NaN },
  { ...metadata, kind: 'script' },
])('rejects malformed or unsafe metadata %#', (value) => {
  expect(() => parsePaperMetadata(value)).toThrow(ExamError);
});
it('only accepts allocated UUID-shaped submission references', () => {
  expect(validSubmissionId('12345678-1234-4234-8234-123456789012')).toBe(true);
  expect(validSubmissionId('../../bucket')).toBe(false);
  expect(validSubmissionId('12345678-1234-1234-1234-123456789012')).toBe(false);
});
it('returns useful expected errors but hides internal failures', async () => {
  expect(
    await examAction(async () => {
      throw new ExamError('Choose a PDF.');
    }),
  ).toEqual({ ok: false, error: 'Choose a PDF.' });
  expect(
    JSON.stringify(
      await examAction(async () => {
        throw new Error('SECRET SDK DETAILS');
      }),
    ),
  ).not.toContain('SECRET');
  expect(unwrapExamResult(await examAction(async () => 3))).toBe(3);
});
