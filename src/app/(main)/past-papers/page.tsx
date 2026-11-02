import type { Metadata } from 'next';
import { ExamRepository } from '@/lib/aws/repositories/exam.repository';
import { getExamUser } from '@/lib/exams/auth';
import { examIntakeEnabled } from '@/lib/exams/storage';
import { examYears, type ExamCoverage } from '@/domains/exams/catalog';
import PaperArchive from './PaperArchive';

export const metadata: Metadata = {
  title: 'BGCSE past-paper collection',
  description:
    'Help build the Bahamas BGCSE paper collection. Find the years still needed and contribute papers for superadmin review.',
};

export default async function PastPapersPage() {
  const user = await getExamUser();
  let coverage: ExamCoverage[] = [];
  let available = true;
  try {
    coverage = await ExamRepository.catalog();
  } catch {
    available = false;
  }
  return (
    <PaperArchive
      coverage={coverage}
      years={examYears()}
      available={available}
      signedIn={!!user}
      superadmin={user?.superadmin ?? false}
      intakeEnabled={examIntakeEnabled()}
    />
  );
}
