import { ExamError } from './results';

export const EXAM_ID = 'bgcse';
export const EXAM_NAME = 'Bahamas BGCSE';
export const FIRST_EXAM_YEAR = 1999;
export const MAX_PAPER_BYTES = 20 * 1024 * 1024;
export const PAPER_KINDS = ['Question paper', 'Mark scheme', 'Syllabus'] as const;
export type PaperKind = (typeof PAPER_KINDS)[number];

export const SUBJECT_GROUPS = [
  {
    name: 'Language Arts & Modern Languages',
    subjects: [
      ['english-language', 'English Language'],
      ['english-literature', 'English Literature'],
      ['french', 'French'],
      ['spanish', 'Spanish'],
    ],
  },
  {
    name: 'Sciences & Mathematics',
    subjects: [
      ['mathematics', 'Mathematics'],
      ['biology', 'Biology'],
      ['chemistry', 'Chemistry'],
      ['physics', 'Physics'],
      ['combined-science', 'Combined Science'],
    ],
  },
  {
    name: 'Business & Commercial Studies',
    subjects: [
      ['bookkeeping-accounts', 'Bookkeeping & Accounts'],
      ['commerce', 'Commerce'],
      ['economics', 'Economics'],
      ['keyboarding', 'Keyboarding'],
      ['office-procedures', 'Office Procedures'],
    ],
  },
  {
    name: 'Humanities & Social Sciences',
    subjects: [
      ['geography', 'Geography'],
      ['history', 'History'],
      ['religious-studies', 'Religious Studies'],
    ],
  },
  {
    name: 'Creative & Performing Arts',
    subjects: [
      ['art-design', 'Art & Design'],
      ['art-craft', 'Art & Craft'],
      ['music', 'Music'],
    ],
  },
  {
    name: 'Family & Consumer Sciences',
    subjects: [
      ['clothing-construction', 'Clothing Construction'],
      ['food-nutrition', 'Food & Nutrition'],
    ],
  },
  {
    name: 'Technical & Vocational Fields',
    subjects: [
      ['auto-mechanics', 'Auto Mechanics'],
      ['carpentry-joinery', 'Carpentry & Joinery'],
      ['electrical-installation', 'Electrical Installation'],
      ['graphical-communications', 'Graphical Communications'],
    ],
  },
] as const;
export const EXAM_SUBJECTS = SUBJECT_GROUPS.flatMap((group) =>
  group.subjects.map(([id, name]) => ({ id, name, group: group.name })),
);
export const BJC_SUBJECT_GROUPS = [
  {
    name: 'Core Academic Subjects',
    subjects: [
      ['english-language', 'English Language'],
      ['literature', 'Literature'],
      ['mathematics', 'Mathematics'],
      ['social-studies', 'Social Studies'],
      ['religious-studies', 'Religious Studies'],
    ],
  },
  {
    name: 'Sciences',
    subjects: [
      ['general-science', 'General Science'],
      ['health-science', 'Health Science'],
    ],
  },
  {
    name: 'Creative, Technical & Vocational Arts',
    subjects: [
      ['art-design', 'Art & Design'],
      ['craft', 'Craft'],
      ['family-consumer-science', 'Family & Consumer Science'],
      ['technical-drawing', 'Technical Drawing'],
    ],
  },
] as const;
export const EXAM_QUALIFICATIONS = {
  bgcse: { name: 'Bahamas BGCSE', label: 'BGCSE', groups: SUBJECT_GROUPS },
  bjc: { name: 'Bahamas BJC', label: 'BJC', groups: BJC_SUBJECT_GROUPS },
} as const;
export type ExamQualification = keyof typeof EXAM_QUALIFICATIONS;
const BJC_SUBJECTS = BJC_SUBJECT_GROUPS.flatMap((group) =>
  group.subjects.map(([id, name]) => ({ id, name, group: group.name })),
);
export type ExamSubject = (typeof EXAM_SUBJECTS | typeof BJC_SUBJECTS)[number]['id'];
export function isExamQualification(value: unknown): value is ExamQualification {
  return typeof value === 'string' && Object.hasOwn(EXAM_QUALIFICATIONS, value);
}
export function subjectsFor(qualification: ExamQualification) {
  return qualification === 'bjc' ? BJC_SUBJECTS : EXAM_SUBJECTS;
}

export function examYears(currentYear = new Date().getUTCFullYear()): number[] {
  return Array.from(
    { length: Math.max(0, currentYear - FIRST_EXAM_YEAR + 1) },
    (_, i) => currentYear - i,
  );
}
export function isExamSubject(
  value: unknown,
  qualification: ExamQualification = 'bgcse',
): value is ExamSubject {
  return (
    typeof value === 'string' && subjectsFor(qualification).some((subject) => subject.id === value)
  );
}
export function validExamYear(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= FIRST_EXAM_YEAR &&
    value <= new Date().getUTCFullYear()
  );
}
export function subjectName(id: string): string {
  return [...EXAM_SUBJECTS, ...BJC_SUBJECTS].find((subject) => subject.id === id)?.name ?? id;
}

export interface AcceptedPaper {
  id: string;
  component: string;
  kind: PaperKind;
}
export interface ExamCoverage {
  qualification: ExamQualification;
  subject: ExamSubject;
  year: number;
  version: number;
  pending: number;
  accepted: AcceptedPaper[];
  complete: boolean;
}
export type CoverageStatus = 'needed' | 'review' | 'partial' | 'collected';
export function coverageStatus(coverage?: ExamCoverage): CoverageStatus {
  if (coverage?.complete) return 'collected';
  if (coverage?.accepted.length) return 'partial';
  return coverage?.pending ? 'review' : 'needed';
}
export const COVERAGE_LABELS: Record<CoverageStatus, string> = {
  needed: 'Needed',
  review: 'Under review',
  partial: 'Partly collected',
  collected: 'Collected',
};

export interface PaperMetadata {
  qualification: ExamQualification;
  subject: ExamSubject;
  year: number;
  component: string;
  kind: PaperKind;
  notes: string;
  filename: string;
  size: number;
}
export function parsePaperMetadata(raw: unknown): PaperMetadata {
  if (!raw || typeof raw !== 'object')
    throw new ExamError('Choose a subject, year, and paper component.');
  const value = raw as Record<string, unknown>;
  const qualification = value.qualification ?? 'bgcse';
  if (!isExamQualification(qualification)) throw new ExamError('Choose BJC or BGCSE.');
  if (!isExamSubject(value.subject, qualification) || !validExamYear(value.year))
    throw new ExamError('Choose a listed subject and a year from 1999 to the current year.');
  if (!PAPER_KINDS.includes(value.kind as PaperKind))
    throw new ExamError('Choose a document type.');
  if (
    typeof value.component !== 'string' ||
    !value.component.trim() ||
    value.component.trim().length > 100 ||
    /[\x00-\x1f\x7f]/.test(value.component)
  )
    throw new ExamError('Name the paper component using 1–100 characters.');
  if (
    typeof value.notes !== 'string' ||
    value.notes.length > 1000 ||
    /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value.notes)
  )
    throw new ExamError('Keep notes under 1,000 characters.');
  if (
    typeof value.filename !== 'string' ||
    value.filename.length > 180 ||
    !/\.pdf$/i.test(value.filename) ||
    /[/\\\x00-\x1f\x7f]/.test(value.filename)
  )
    throw new ExamError('Choose a PDF with a simple filename under 180 characters.');
  if (
    typeof value.size !== 'number' ||
    !Number.isInteger(value.size) ||
    value.size < 8 ||
    value.size > MAX_PAPER_BYTES
  )
    throw new ExamError('Choose a PDF up to 20 MB.');
  if (value.permission !== true)
    throw new ExamError('Confirm that you have permission to contribute this document.');
  return {
    qualification,
    subject: value.subject,
    year: value.year,
    component: value.component.trim(),
    kind: value.kind as PaperKind,
    notes: value.notes.trim(),
    filename: value.filename,
    size: value.size,
  };
}

export interface PaperSubmission extends PaperMetadata {
  id: string;
  owner: string;
  objectKey: string;
  createdAt: string;
  expiresAt: number;
  status: 'uploading' | 'pending' | 'accepted' | 'rejected';
  versionId?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
}
export function validSubmissionId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value)
  );
}
