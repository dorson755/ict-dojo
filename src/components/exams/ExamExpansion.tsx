import Link from 'next/link';
import styles from './ExamExpansion.module.css';

export default function ExamExpansion() {
  return (
    <section className={styles.expansion} aria-labelledby="exam-expansion-title">
      <span>Next chapter</span>
      <div>
        <h2 id="exam-expansion-title">National-exam practice is coming.</h2>
        <p>
          We&apos;re building Bahamas BJC and BGCSE paper collections, ahead of syllabus-aligned
          practice that tests understanding, not just memory.
        </p>
      </div>
      <Link href="/past-papers">Help collect past papers</Link>
    </section>
  );
}
