import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStudySubject } from '@/domains/study/catalog';
import styles from '@/components/study/study.module.css';

type Props = { params: Promise<{ qualification: string; subject: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { qualification, subject } = await params;
  const entry = getStudySubject(qualification, subject);
  return {
    title: entry
      ? `${qualification.toUpperCase()} ${entry.name} Study Library | ICT Dojo`
      : 'Subject not found',
  };
}

export default async function SubjectStudyPage({ params }: Props) {
  const { qualification, subject } = await params;
  const entry = getStudySubject(qualification, subject);
  if (!entry) notFound();
  const { library } = entry;
  const base = `/study/${qualification}/${subject}`;
  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link href="/study">Study library</Link>
        <span>{qualification.toUpperCase()}</span>
        <span aria-current="page">{entry.name}</span>
      </nav>
      <header className={styles.hero}>
        <h1>{library?.title ?? entry.name}</h1>
        <p>
          {library?.description ??
            `The ${qualification.toUpperCase()} ${entry.name} library is coming soon. Study notes, syllabus guidance and resources have not been added yet.`}
        </p>
      </header>
      {!library ? (
        <section className={styles.notice}>
          <h2>Course materials are on the way</h2>
          <p>This subject has a place in the library, but no lessons are published yet.</p>
          <Link href={`/past-papers?exam=${qualification}`}>Visit the past-paper collection</Link>
          <p>
            <Link href="/study">Explore available study notes</Link>
          </p>
        </section>
      ) : (
        <>
          <div className={styles.actions}>
            <Link className={styles.button} href={`${base}/session-1`}>
              Start session 1
            </Link>
            <Link href="#syllabus">Syllabus overview</Link>
            <Link href={`${base}/teacher-guide`}>Teacher guide</Link>
            <Link href="/practice">Typing practice (sign-in required)</Link>
          </div>
          <div className={styles.courseLayout}>
            <section aria-labelledby="session-heading">
              <h2 id="session-heading">Study sessions</h2>
              <p className={styles.muted}>
                Follow the supplied notes in order, or revisit a topic. Reading does not award XP or
                record completion.
              </p>
              <ol className={styles.sessions}>
                {library.sessions.map((session) => (
                  <li key={session.slug}>
                    <Link href={`${base}/${session.slug}`}>
                      <span className={styles.sessionNumber}>
                        {String(session.number).padStart(2, '0')}
                      </span>
                      <span>
                        <strong>{session.title}</strong>
                        <small>{session.sections[0].text}</small>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
            <aside id="syllabus" className={styles.syllabus} aria-labelledby="syllabus-heading">
              <h2 id="syllabus-heading">Syllabus overview</h2>
              <p>
                Based on the Ministry of Education’s{' '}
                <strong>Keyboarding Skills Syllabus 2006</strong>, supplied for this library. It is
                not a verified current exam specification.
              </p>
              <a
                href="/study/bgcse-keyboarding-syllabus-2006.pdf"
                target="_blank"
                rel="noopener noreferrer"
              >
                Read the source syllabus (PDF, 761 KB, new tab)
              </a>
              <h3>What the course develops</h3>
              <ul>
                <li>
                  Accurate alphabetic, numeric and symbol keyboarding, with equipment care and
                  professional work habits.
                </li>
                <li>
                  Business correspondence, envelopes, memos, proofreading marks and rough-draft
                  transcription.
                </li>
                <li>Reports, tables, display documents and government document formats.</li>
                <li>
                  Extended production: multi-page work, citations, complex tables, forms,
                  itineraries, employment and legal documents.
                </li>
              </ul>
              <h3>Assessment in this edition</h3>
              <p>
                Core Paper 1 is for all candidates. Extended Paper 2 offers a route to grades A and
                B. Both cover document-production tasks, not typing speed alone.
              </p>
              <p>
                The stated speed aims are <strong>35 net WPM at Core</strong> and{' '}
                <strong>55 net WPM at Extended</strong>. These are not standalone grade guarantees.
              </p>
              <div className={styles.notice}>
                <h3>Confirm current exam instructions</h3>
                <p>
                  Page 8 gives Paper 1 as 2½ hours; page 10 gives 2 hours. Both add 10 minutes’
                  reading time. Paper 2 is listed as 2½ hours plus 10 minutes’ reading time. Ask
                  your teacher to confirm the current paper’s timing, permitted tools and marking
                  scheme.
                </p>
              </div>
              <h3>Coverage note</h3>
              <p>
                The 25 sessions follow the supplied student notes. They do not yet teach every item
                in the syllabus, including the full range of legal and government documents,
                employment documents and legacy carbon-copy procedures. Use the syllabus checklist
                and your teacher’s materials to fill those gaps.
              </p>
              <h3>How to use the resources</h3>
              <p>
                Measurements and document conventions are practice models. The task’s instructions
                take priority. Videos are supplementary demonstrations, not official BGCSE guidance;
                Word menus can differ by version.
              </p>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
