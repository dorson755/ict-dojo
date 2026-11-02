'use client';

import { useRouter } from 'next/navigation';
import { EXAM_QUALIFICATIONS, type ExamQualification } from '@/domains/exams/catalog';
import styles from './papers.module.css';

export default function QualificationPicker({
  qualification,
  review = false,
  disabled = false,
}: {
  qualification: ExamQualification;
  review?: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  return (
    <nav className={styles.qualificationSwitch} aria-label="Exam qualification">
      {(Object.keys(EXAM_QUALIFICATIONS) as ExamQualification[]).map((id) => (
        <button
          key={id}
          type="button"
          aria-pressed={qualification === id}
          disabled={disabled}
          onClick={() => router.push(`/past-papers${review ? '/review' : ''}?exam=${id}`)}
        >
          {EXAM_QUALIFICATIONS[id].label}
        </button>
      ))}
    </nav>
  );
}
