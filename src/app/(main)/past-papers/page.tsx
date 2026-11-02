import type { Metadata } from 'next';
import { ExamRepository } from '@/lib/aws/repositories/exam.repository';
import { getExamUser } from '@/lib/exams/auth';
import { examIntakeEnabled } from '@/lib/exams/storage';
import { examYears, isExamQualification, type ExamCoverage } from '@/domains/exams/catalog';
import PaperArchive from './PaperArchive';

export const metadata: Metadata = {
  title: 'BJC & BGCSE past-paper collections',
  description:
    'Help build the Bahamas BJC and BGCSE paper collections. Find the years still needed and contribute papers for superadmin review.',
};

export default async function PastPapersPage({
  searchParams,
}: {
  searchParams: Promise<{ exam?: string }>;
}) {
  const { exam } = await searchParams;
  const qualification = isExamQualification(exam) ? exam : 'bgcse';
  const user = await getExamUser();
  let coverage: ExamCoverage[] = [];
  let available = true;
  try {
    coverage = await ExamRepository.catalog(qualification);
  } catch {
    available = false;
  }
  return (
    <PaperArchive
      key={qualification}
      qualification={qualification}
      coverage={coverage}
      years={examYears()}
      available={available}
      signedIn={!!user}
      superadmin={user?.superadmin ?? false}
      intakeEnabled={examIntakeEnabled()}
    />
  );
}
