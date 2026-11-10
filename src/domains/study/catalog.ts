import { isExamQualification, subjectsFor, type ExamQualification } from '@/domains/exams/catalog';
import keyboardingJson from './keyboarding.json';

export interface StudyVideo {
  id: string;
  title: string;
  note: string;
}

export interface StudyImage {
  src: string;
  alt: string;
  caption: string;
  credit: string;
  creditUrl?: string;
}

export interface StudySessionSection {
  title: string;
  text: string;
}

export interface StudySession {
  number: number;
  slug: string;
  title: string;
  sections: StudySessionSection[];
  imagesTitle?: string;
  images?: StudyImage[];
}

const keyboarding = keyboardingJson as {
  sessions: StudySession[];
  teacherLessons: { title: string; text: string }[];
};

export const KEYBOARDING_VIDEOS: Record<number, StudyVideo[]> = {
  1: [
    {
      id: 'gfFHkqJZ7so',
      title: 'Home row typing',
      note: 'Watch the anchor-and-return technique, then practise at a comfortable pace.',
    },
    {
      id: 'kY6H2bHHv5M',
      title: 'Typing ergonomics',
      note: 'Check your seating, screen position and wrist posture before your next drill.',
    },
  ],
  2: [
    {
      id: 'mXWvKHWe2Co',
      title: 'Word: Line and Paragraph Spacing',
      note: 'LearnFree demonstrates spacing tools. Menu names may vary by Word version.',
    },
  ],
  3: [
    {
      id: '-oMx3Z5bvOw',
      title: '12 Common Proofreading Marks and What They Mean',
      note: 'Use Reedsy’s examples to recognise marks, then compare them with your class reference chart.',
    },
  ],
  4: [
    {
      id: 'ReU2UyHoqjQ',
      title: 'Business Letter: Block Format',
      note: 'Observe the layout. Use your question’s punctuation and measurements, not an assumed universal template.',
    },
    {
      id: 'yhKs2PaydIY',
      title: 'Using Tabs to Format a Letter in Modified Block Style',
      note: 'Focus on tab stops rather than repeated spaces.',
    },
  ],
  5: [
    {
      id: 'HwRoiCYH2HA',
      title: 'Word: Different First Page Header',
      note: 'Apply the technique to continuation details on page 2 onward.',
    },
  ],
  6: [
    {
      id: 'R6PV186C2Mw',
      title: 'How to Create an Envelope in Word',
      note: 'Verify the delivery address and envelope size against the task.',
    },
  ],
  7: [
    {
      id: 'PC6h66Tarf0',
      title: 'Formatting a memo',
      note: 'Compare the memo header with your supplied model.',
    },
  ],
  8: [
    {
      id: 'XNBrCEgzddw',
      title: 'Word: Tables',
      note: 'LearnFree introduces table creation and layout tools.',
    },
  ],
  9: [
    {
      id: '0Z069DbOxJM',
      title: 'Decimal tabs in Word',
      note: 'Watch how the decimal points stay aligned as values change.',
    },
  ],
  10: [
    {
      id: '9QVhfnhKrbs',
      title: 'Dot leaders in Word',
      note: 'Use a tab leader rather than typing a row of full stops.',
    },
  ],
  11: [
    {
      id: 'XNBrCEgzddw',
      title: 'Word: Tables',
      note: 'Revisit the table tools before choosing a layout for mixed data.',
    },
  ],
  12: [
    {
      id: 'LHu6Y5wuyFA',
      title: 'How to Set Page Margins for Different Types of Documents',
      note: 'Follow the actual task for exact margin values.',
    },
  ],
  13: [
    {
      id: 'eAJPcr3V-x4',
      title: 'Footnotes in Microsoft Word',
      note: 'Use automatic numbering instead of manually positioning notes.',
    },
  ],
  14: [
    {
      id: 'cST_Q5VpLRw',
      title: 'Meeting minutes',
      note: 'Look for decisions, action owners and the meeting record structure.',
    },
  ],
  15: [
    {
      id: 'XNBrCEgzddw',
      title: 'Word: Tables',
      note: 'Adapt table structure to a day-by-day itinerary or a clearly labelled form.',
    },
  ],
  16: [
    {
      id: '-oMx3Z5bvOw',
      title: '12 Common Proofreading Marks and What They Mean',
      note: 'Review correction symbols before transcribing a marked draft.',
    },
  ],
  17: [
    {
      id: 'gfFHkqJZ7so',
      title: 'Home row typing',
      note: 'Revisit consistent reaches, then drill the specific errors in your own log.',
    },
  ],
  18: [
    {
      id: 'gfFHkqJZ7so',
      title: 'Home row typing',
      note: 'Use consistent movement during your paced run. This video is not an exam-scoring authority.',
    },
  ],
  19: [
    {
      id: 'yhKs2PaydIY',
      title: 'Using Tabs to Format a Letter in Modified Block Style',
      note: 'Refresh the tool steps before the mixed-document rehearsal.',
    },
  ],
  20: [
    {
      id: 'kY6H2bHHv5M',
      title: 'Typing ergonomics',
      note: 'Set up comfortably before a sustained timed rehearsal.',
    },
  ],
  21: [
    {
      id: 'R6PV186C2Mw',
      title: 'How to Create an Envelope in Word',
      note: 'Review before starting the timer, not during the simulation.',
    },
  ],
  22: [
    {
      id: '0Z069DbOxJM',
      title: 'Decimal tabs in Word',
      note: 'Review numeric alignment before your timed table task.',
    },
  ],
  23: [
    {
      id: 'mXWvKHWe2Co',
      title: 'Word: Line and Paragraph Spacing',
      note: 'Optional pre-mock refresher. Do not use videos during a closed-resource simulation.',
    },
  ],
  24: [
    {
      id: '-oMx3Z5bvOw',
      title: '12 Common Proofreading Marks and What They Mean',
      note: 'Use this only if correction symbols are part of your remediation plan.',
    },
  ],
  25: [
    {
      id: 'kY6H2bHHv5M',
      title: 'Typing ergonomics',
      note: 'A final setup check before the simulation begins.',
    },
  ],
};

export const keyboardingLibrary = {
  title: 'Keyboarding & Document Processing',
  description:
    'Build accurate typing and confident document production, from page setup to exam rehearsal.',
  sessions: keyboarding.sessions,
  teacherLessons: keyboarding.teacherLessons,
};

export function getStudySubject(qualification: string, subject: string) {
  if (!isExamQualification(qualification)) return undefined;
  const entry = subjectsFor(qualification).find((item) => item.id === subject);
  if (!entry) return undefined;
  return {
    ...entry,
    qualification,
    library:
      qualification === 'bgcse' && subject === 'keyboarding' ? keyboardingLibrary : undefined,
  };
}

export function studySubjects(qualification: ExamQualification) {
  return subjectsFor(qualification).map((subject) => ({
    ...subject,
    qualification,
    sessionCount:
      qualification === 'bgcse' && subject.id === 'keyboarding' ? keyboarding.sessions.length : 0,
  }));
}

export type StudySubjectSummary = ReturnType<typeof studySubjects>[number];

export function getStudySession(qualification: string, subject: string, slug: string) {
  return getStudySubject(qualification, subject)?.library?.sessions.find(
    (session) => session.slug === slug,
  );
}
