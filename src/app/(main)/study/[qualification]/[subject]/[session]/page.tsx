import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStudySubject, getStudySession, KEYBOARDING_VIDEOS } from '@/domains/study/catalog';
import StudyText from '@/components/study/StudyText';
import StudyVideo from '@/components/study/StudyVideo';
import styles from '@/components/study/study.module.css';

type Props = { params: Promise<{ qualification: string; subject: string; session: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { qualification, subject, session } = await params;
  const entry = getStudySession(qualification, subject, session);
  return { title: entry ? `${entry.title} | Keyboarding Study Library` : 'Session not found' };
}

export default async function StudySessionPage({ params }: Props) {
  const { qualification, subject, session: slug } = await params;
  const subjectEntry = getStudySubject(qualification, subject);
  const session = getStudySession(qualification, subject, slug);
  if (!session || !subjectEntry?.library) notFound();
  const base = `/study/${qualification}/${subject}`;
  const sessions = subjectEntry.library.sessions;
  const previous = sessions[session.number - 2];
  const next = sessions[session.number];
  return (
    <div className={styles.readingPage}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link href="/study">Study library</Link>
        <Link href={base}>BGCSE Keyboarding</Link>
        <span aria-current="page">Session {session.number}</span>
      </nav>
      <header className={styles.hero}>
        <p className={styles.available}>
          Session {session.number} of {sessions.length}
        </p>
        <h1>{session.title}</h1>
      </header>
      <div className={styles.readingLayout}>
        <article className={styles.lesson} aria-label="Study notes">
          {session.sections.map((section, index) => (
            <section key={section.title} id={`section-${index}`} className={styles.lessonSection}>
              <h2>{section.title}</h2>
              <StudyText
                text={section.text}
                example={section.title.startsWith('Worked example:')}
              />
            </section>
          ))}
          {session.images && session.images.length > 0 && (
            <section className={styles.lessonSection} aria-labelledby="session-gallery">
              <h2 id="session-gallery">{session.imagesTitle ?? 'See it in real life'}</h2>
              <div className={styles.gallery}>
                {session.images.map((image) => (
                  <figure key={image.src} className={styles.figure}>
                    {/* Local course images in /public; plain img keeps these static and unoptimized on purpose. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.src} alt={image.alt} loading="lazy" />
                    <figcaption>
                      {image.caption}{' '}
                      <small>
                        {image.creditUrl ? (
                          <a href={image.creditUrl} target="_blank" rel="noopener noreferrer">
                            {image.credit}
                          </a>
                        ) : (
                          image.credit
                        )}
                      </small>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}
          <section className={styles.lessonSection} aria-labelledby="practice-next">
            <h2 id="practice-next">Put it into practice</h2>
            <p>
              Produce a short document using this session’s technique, or complete a targeted typing
              drill. Check it against the notes and record one thing to improve.
            </p>
            <div className={styles.actions}>
              <Link href="/practice">Open typing practice (sign-in required)</Link>
              <Link href="/document-craft/projects">Open Documents (sign-in required)</Link>
            </div>
          </section>
        </article>
        <aside className={styles.lessonAside} aria-label="Session resources">
          <nav className={styles.contents} aria-label="On this page">
            <h2>In this session</h2>
            {session.sections.map((section, index) => (
              <a key={section.title} href={`#section-${index}`}>
                {section.title}
              </a>
            ))}
          </nav>
          <h2>Watch the technique</h2>
          <p className={styles.muted}>
            Supplementary videos. Follow your task’s instructions where conventions differ.
          </p>
          {(KEYBOARDING_VIDEOS[session.number] ?? []).map((video) => (
            <StudyVideo key={video.id} video={video} />
          ))}
        </aside>
      </div>
      <nav className={styles.sessionNavigation} aria-label="Session navigation">
        {previous ? (
          <Link href={`${base}/${previous.slug}`}>Previous: {previous.title}</Link>
        ) : (
          <Link href={base}>All sessions</Link>
        )}
        {next ? (
          <Link href={`${base}/${next.slug}`}>Next: {next.title}</Link>
        ) : (
          <Link href={base}>Return to the library</Link>
        )}
      </nav>
      <p className={styles.footerNote}>
        Adapted from the supplied student study notes, with clarifications for scoring, letter
        styles and simulation timing.{' '}
        <Link href={`${base}#syllabus`}>Source and syllabus limitations</Link>.
      </p>
    </div>
  );
}
