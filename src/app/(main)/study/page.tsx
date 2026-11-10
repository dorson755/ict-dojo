import type { Metadata } from 'next';
import Link from 'next/link';
import StudyDirectory from '@/components/study/StudyDirectory';
import { studySubjects } from '@/domains/study/catalog';
import styles from '@/components/study/study.module.css';

export const metadata: Metadata = {
  title: 'BJC & BGCSE Study Library | ICT Dojo',
  description:
    'Browse Bahamas BJC and BGCSE subjects. Start with Keyboarding study notes, syllabus guidance and video lessons.',
};

export default function StudyPage() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <h1>Study library</h1>
        <p>
          A place for every BJC and BGCSE subject. Read the notes, see the technique, then put it
          into practice.
        </p>
      </header>
      <section className={styles.feature} aria-labelledby="keyboarding-feature">
        <div>
          <span className={styles.available}>First library open · BGCSE</span>
          <h2 id="keyboarding-feature">
            Keyboarding &amp;
            <br />
            Document Processing
          </h2>
          <p>
            25 study sessions, a syllabus overview, teaching guidance and videos to support your
            practice.
          </p>
          <Link className={styles.button} href="/study/bgcse/keyboarding">
            Open Keyboarding library
          </Link>
        </div>
        <ol className={styles.preview}>
          <li>
            <span>Learn</span>
            <p>Understand the rule and the reader’s problem it solves.</p>
          </li>
          <li>
            <span>Make</span>
            <p>Follow the tool steps and produce a real document.</p>
          </li>
          <li>
            <span>Check</span>
            <p>Review your work and choose what to practise next.</p>
          </li>
        </ol>
      </section>
      <StudyDirectory subjects={[...studySubjects('bgcse'), ...studySubjects('bjc')]} />
      <p className={styles.footerNote}>
        More libraries will open as course materials are added.{' '}
        <Link href="/past-papers">Browse or contribute past papers</Link>.
      </p>
    </div>
  );
}
