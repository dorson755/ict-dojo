import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getExamUser } from '@/lib/exams/auth';
import { ExamRepository } from '@/lib/aws/repositories/exam.repository';
import { examYears, isExamQualification, validSubmissionId } from '@/domains/exams/catalog';
import ReviewQueue from './ReviewQueue';
import QualificationPicker from '../QualificationPicker';
import styles from '../papers.module.css';

export const metadata = {
  title: 'National-exam paper review',
  robots: { index: false, follow: false },
};
export default async function PaperReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ after?: string; exam?: string }>;
}) {
  const user = await getExamUser();
  if (!user) redirect('/login');
  if (!user.superadmin) redirect('/past-papers');
  const { after, exam } = await searchParams;
  const qualification = isExamQualification(exam) ? exam : 'bgcse';
  const [queue, coverage] = await Promise.all([
    ExamRepository.reviewQueue(validSubmissionId(after) ? after : undefined, qualification),
    ExamRepository.catalog(qualification),
  ]);
  return (
    <div className={`${styles.page} ${styles.reviewPage}`}>
      <Link href={`/past-papers?exam=${qualification}`} className={styles.quiet}>
        Back to the public collection
      </Link>
      <QualificationPicker qualification={qualification} review />
      <header className={styles.reviewIntro}>
        <h1>Review the next contribution.</h1>
        <p>
          Accept individual components after checking their source, safety, legibility, subject,
          year, and paper number. Acceptance does not mark a whole year collected. Confirm year
          coverage separately below.
        </p>
      </header>
      <ReviewQueue
        key={qualification}
        qualification={qualification}
        rows={queue.rows.map((row) => ({
          qualification,
          id: row.id,
          subject: row.subject,
          year: row.year,
          component: row.component,
          kind: row.kind,
          filename: row.filename,
          size: row.size,
          notes: row.notes,
          createdAt: row.createdAt,
        }))}
        coverage={coverage}
        years={examYears()}
      />
      <nav className={styles.nextPage} aria-label="Review queue pages">
        {after && <Link href={`/past-papers/review?exam=${qualification}`}>First queue page</Link>}
        {queue.next && (
          <Link href={`/past-papers/review?exam=${qualification}&after=${queue.next}`}>
            Next submissions
          </Link>
        )}
      </nav>
    </div>
  );
}
