import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStudySubject } from '@/domains/study/catalog';
import StudyText from '@/components/study/StudyText';
import styles from '@/components/study/study.module.css';

export const metadata = { title: 'Keyboarding Teacher Guide | ICT Dojo' };

export default async function TeacherGuide({
  params,
}: {
  params: Promise<{ qualification: string; subject: string }>;
}) {
  const { qualification, subject } = await params;
  const entry = getStudySubject(qualification, subject);
  if (!entry?.library) notFound();
  return (
    <div className={styles.readingPage}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link href="/study">Study library</Link>
        <Link href={`/study/${qualification}/${subject}`}>Keyboarding</Link>
        <span aria-current="page">Teacher guide</span>
      </nav>
      <header className={styles.hero}>
        <h1>Teach the reason behind the rule.</h1>
        <p>
          Keyboarding &amp; Document Processing teacher guide, adapted from the supplied
          understanding-based weekly lesson plans.
        </p>
      </header>
      <section className={styles.lessonSection}>
        <h2>A 90-minute weekly rhythm</h2>
        <p>
          Start with 15 minutes of focused typing practice. Use the remaining 75 minutes to diagnose
          a reader’s problem, teach the rule, demonstrate the software, produce a document and
          review errors.
        </p>
        <ol className={styles.steps}>
          <li>Typing Dojo: 15 minutes of motor-skill drills.</li>
          <li>Diagnose and question: 10 minutes examining a flawed document.</li>
          <li>Direct instruction: 10 minutes explaining the rule.</li>
          <li>Tool walkthrough: 10 minutes when a tool is new.</li>
          <li>Guided production: 25 minutes, or 35 without a walkthrough.</li>
          <li>Error review: 10 minutes of checking and reflection.</li>
        </ol>
      </section>
      <section className={styles.notice}>
        <h2>Planning and assessment cautions</h2>
        <p>
          The teacher source has 26 weekly lessons, while the student notes have 25 sessions. The
          student introduction combines platform orientation and early keyboard practice; do not
          match these two sequences by number.
        </p>
        <p>
          The six-month targets are classroom milestones, not exam grade boundaries. Use a
          consistent, comfortable typing method, and adapt finger drills to students’ needs.
        </p>
        <p>
          Full mocks need separate extended sittings. A 35-minute production block cannot reproduce
          the full timing of one or both papers. The source’s Paper 1 speed rehearsal is only a
          partial practice task.
        </p>
        <p>
          The classroom NWPM formula is not verified as the official marking rule. Letter
          punctuation, binding margins, permitted tools and assessment criteria must follow the
          selected paper and current instructions. The 2006 syllabus also contains a Paper 1 timing
          conflict.
        </p>
        <p>
          These plans are teaching resources, not complete worksheets or official papers. Prepare
          the sample drafts, raw data, templates and authorised mark schemes listed under each
          lesson’s materials.
        </p>
      </section>
      <section className={styles.teacherLessons} aria-labelledby="lesson-plans">
        <h2 id="lesson-plans">Weekly lesson plans</h2>
        {entry.library.teacherLessons.map((lesson, index) => (
          <details key={lesson.title}>
            <summary>
              Lesson {index + 1}: {lesson.title}
            </summary>
            <StudyText text={lesson.text} />
          </details>
        ))}
      </section>
      <Link href={`/study/${qualification}/${subject}`}>Return to the student library</Link>
    </div>
  );
}
