import { STATUS_LABEL, type LearnerStatus } from './learner-status';
import { beltBlockerSummary, type BeltStatus } from './belt-status';
import type { MasterySummary } from './mastery-summary';
import { getBeltName } from '@/domains/shared/belt-names';

export interface CsvLearner {
  display_name?: string;
  grade_level?: string | number;
  platform_level?: number;
  streak_count?: number;
  sessionsThisWeek: number;
  minutesThisWeek: number;
  averageWpm: number;
  averageAccuracy: number;
  wpmTrend: number;
  accuracyTrend: number;
  masterySummary: MasterySummary;
  weakSkills: number;
  lastPractice: Date | null;
  status: LearnerStatus;
  reason: string;
  belt: BeltStatus;
}

const HEADERS = [
  'Learner', 'Grade', 'Level', 'Sessions this week', 'Minutes this week', 'Average WPM',
  'Average accuracy', 'WPM trend', 'Accuracy trend', 'Skills assessed', 'Skills strong or better',
  'Average score on assessed skills', 'Weak skills', 'Streak', 'Last practice', 'Status', 'Signal',
  'Belt', 'Next belt', 'Belt note',
];

function quote(value: unknown): string {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export function learnersToCsv(students: CsvLearner[]): string {
  const rows = students.map((student) => [
    student.display_name || 'Learner', student.grade_level || '', student.platform_level || 1,
    student.sessionsThisWeek, student.minutesThisWeek, student.averageWpm || '', student.averageAccuracy || '',
    student.wpmTrend, student.accuracyTrend,
    `${student.masterySummary.assessed} of ${student.masterySummary.total}`,
    student.masterySummary.secure, student.masterySummary.averageScore ?? '',
    student.weakSkills,
    student.streak_count || 0, student.lastPractice?.toISOString() || '', STATUS_LABEL[student.status], student.reason,
    getBeltName(student.belt.belt), student.belt.nextBelt === null ? '' : getBeltName(student.belt.nextBelt),
    beltBlockerSummary(student.belt),
  ]);
  return [HEADERS, ...rows].map((row) => row.map(quote).join(',')).join('\n');
}
