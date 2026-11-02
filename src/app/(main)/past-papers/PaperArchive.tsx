'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  COVERAGE_LABELS,
  EXAM_NAME,
  EXAM_SUBJECTS,
  MAX_PAPER_BYTES,
  PAPER_KINDS,
  SUBJECT_GROUPS,
  coverageStatus,
  subjectName,
} from '@/domains/exams/catalog';
import type { ExamCoverage, ExamSubject, PaperKind } from '@/domains/exams/catalog';
import { beginPaperUpload, finishPaperUpload } from './actions';
import { unwrapExamResult } from '@/domains/exams/results';
import styles from './papers.module.css';

export default function PaperArchive({
  coverage,
  years,
  available,
  signedIn,
  superadmin,
  intakeEnabled,
}: {
  coverage: ExamCoverage[];
  years: number[];
  available: boolean;
  signedIn: boolean;
  superadmin: boolean;
  intakeEnabled: boolean;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState<ExamSubject>('mathematics');
  const [year, setYear] = useState(years[0]);
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<PaperKind>('Question paper');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [retryId, setRetryId] = useState<string | null>(null);
  const details = useRef<HTMLElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const uploadLock = useRef(false);
  const records = new Map(coverage.map((row) => [`${row.subject}#${row.year}`, row]));
  const selected = records.get(`${subject}#${year}`);
  const complete = coverage.filter((row) => row.complete).length;
  const subjectComplete = coverage.filter((row) => row.subject === subject && row.complete).length;
  const total = EXAM_SUBJECTS.length * years.length;
  const matching = EXAM_SUBJECTS.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  );

  function chooseSubject(id: ExamSubject) {
    setSubject(id);
    setSuccess('');
    setError('');
  }
  function chooseYear(value: number) {
    setYear(value);
    setSuccess('');
    setError('');
    details.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    details.current?.focus({ preventScroll: true });
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploadLock.current) return;
    if (!retryId && !file) {
      setError('Choose the PDF you want to contribute.');
      return;
    }
    const data = new FormData(event.currentTarget);
    uploadLock.current = true;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      if (retryId) {
        setStage('Confirming your upload…');
        unwrapExamResult(await finishPaperUpload(retryId));
      } else {
        const pdf = file!;
        if (pdf.size > MAX_PAPER_BYTES || !pdf.name.toLowerCase().endsWith('.pdf'))
          throw new Error('Choose a PDF up to 20 MB.');
        const header = new Uint8Array(await pdf.slice(0, 5).arrayBuffer());
        if (new TextDecoder().decode(header) !== '%PDF-')
          throw new Error('This file is not a PDF. Export it as a PDF and try again.');
        setStage('Preparing private upload…');
        const result = unwrapExamResult(
          await beginPaperUpload({
            subject,
            year,
            kind,
            component: data.get('component'),
            notes: data.get('notes'),
            filename: pdf.name,
            size: pdf.size,
            permission: data.get('permission') === 'on',
          }),
        );
        const body = new FormData();
        for (const [key, value] of Object.entries(result.upload.fields)) body.append(key, value);
        body.append('file', pdf);
        setStage('Uploading PDF…');
        const response = await fetch(result.upload.url, {
          method: 'POST',
          body,
          credentials: 'omit',
        });
        if (!response.ok)
          throw new Error('The file did not upload. Check your connection and try again.');
        setRetryId(result.id);
        setStage('Confirming your upload…');
        unwrapExamResult(await finishPaperUpload(result.id));
      }
      setRetryId(null);
      setSuccess(
        'Paper submitted for review. It will not mark this year collected until a superadmin checks the required components.',
      );
      setFile(null);
      form.current?.reset();
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'The submission did not finish. Please try again.',
      );
    } finally {
      uploadLock.current = false;
      setBusy(false);
      setStage('');
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <div>
          <p className={styles.qualification}>
            {EXAM_NAME} · 1999–{years[0]}
          </p>
          <h1>A paper for every year.</h1>
          <p className={styles.lead}>
            Help build a shared past-paper collection. Find a gap, contribute a paper, and help the
            next student prepare.
          </p>
          <div className={styles.introLinks}>
            <a href="#collection">Browse the collection</a>
            {superadmin && <Link href="/past-papers/review">Superadmin review</Link>}
            {!signedIn && <Link href="/login">Sign in to contribute</Link>}
          </div>
        </div>
        <aside className={styles.collectionNote}>
          <span>Collection in progress</span>
          <strong>{available ? `${complete} / ${total}` : 'Status unavailable'}</strong>
          <p>subject-years collected</p>
          <progress aria-label="Subject-years collected" value={complete} max={total} />
          <small>
            A year is collected only when a superadmin confirms all its required paper components.
          </small>
        </aside>
      </header>

      <section className={styles.expansion} aria-labelledby="expansion-heading">
        <span className={styles.soon}>Coming soon</span>
        <div>
          <h2 id="expansion-heading">More than remembering the answer.</h2>
          <p>
            National-exam practice is the next chapter: past-paper questions and new
            syllabus-aligned challenges, built to test understanding. Practice and AI-assisted
            marking are not available yet.
          </p>
        </div>
      </section>

      {!available && (
        <p className={styles.error} role="alert">
          The collection status could not be loaded. Years are shown for reference, not as confirmed
          gaps. Refresh this page before contributing.
        </p>
      )}
      <div className={styles.archive} id="collection">
        <aside className={styles.subjects} aria-label="Choose a subject">
          <h2>Find a subject</h2>
          <label htmlFor="subject-search">Search subjects</label>
          <input
            id="subject-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="e.g. Mathematics"
            disabled={busy || !!retryId}
          />
          <label htmlFor="mobile-subject" className={styles.mobileLabel}>
            Subject
          </label>
          <select
            id="mobile-subject"
            className={styles.mobileSelect}
            value={subject}
            onChange={(event) => chooseSubject(event.target.value as ExamSubject)}
            disabled={busy || !!retryId}
          >
            {SUBJECT_GROUPS.map((group) => (
              <optgroup key={group.name} label={group.name}>
                {group.subjects
                  .filter(([id]) => matching.some((item) => item.id === id))
                  .map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          <div className={styles.subjectList}>
            {SUBJECT_GROUPS.map((group) => {
              const subjects = group.subjects.filter(([id]) =>
                matching.some((item) => item.id === id),
              );
              return subjects.length ? (
                <div key={group.name} className={styles.subjectGroup}>
                  <h3>{group.name}</h3>
                  {subjects.map(([id, name]) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={id === subject}
                      className={id === subject ? styles.selectedSubject : ''}
                      disabled={busy || !!retryId}
                      onClick={() => chooseSubject(id)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              ) : null;
            })}
          </div>
          {!matching.length && (
            <p className={styles.quiet}>No subject matches. Try a shorter name.</p>
          )}
        </aside>
        <div className={styles.ledger}>
          <div className={styles.ledgerHeading}>
            <div>
              <p>{EXAM_NAME}</p>
              <h2>{subjectName(subject)}</h2>
            </div>
            <span>
              {available
                ? `${subjectComplete} of ${years.length} years collected`
                : 'Status unavailable'}
            </span>
          </div>
          <p className={styles.ledgerHelp}>
            Choose a year to see accepted components or contribute a missing one.
          </p>
          <ul className={styles.legend} aria-label="Collection status guide">
            <li>
              <i className={styles.needed} />
              Needed
            </li>
            <li>
              <i className={styles.review} />
              Under review
            </li>
            <li>
              <i className={styles.partial} />
              Partly collected
            </li>
            <li>
              <i className={styles.collected} />
              Collected
            </li>
          </ul>
          <div
            className={styles.years}
            role="group"
            aria-label={`${subjectName(subject)} collection by year`}
          >
            {years.map((value) => {
              const row = records.get(`${subject}#${value}`);
              const status = coverageStatus(row);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={year === value}
                  disabled={busy || !!retryId}
                  onClick={() => chooseYear(value)}
                  className={`${styles.year} ${styles[status]} ${year === value ? styles.selectedYear : ''}`}
                >
                  <strong>{value}</strong>
                  <span>{available ? COVERAGE_LABELS[status] : 'Status unavailable'}</span>
                  <small>
                    {available
                      ? `${row?.accepted.length ?? 0} accepted${row?.pending ? `, ${row.pending} pending` : ''}`
                      : 'Please refresh'}
                  </small>
                </button>
              );
            })}
          </div>

          <section
            className={styles.detail}
            ref={details}
            tabIndex={-1}
            aria-labelledby="year-heading"
          >
            <div className={styles.detailHeading}>
              <div>
                <p>{subjectName(subject)}</p>
                <h2 id="year-heading">{year} paper components</h2>
              </div>
              <span className={`${styles.status} ${styles[coverageStatus(selected)]}`}>
                {available ? COVERAGE_LABELS[coverageStatus(selected)] : 'Status unavailable'}
              </span>
            </div>
            {selected?.accepted.length ? (
              <ul className={styles.componentList}>
                {selected.accepted.map((paper) => (
                  <li key={paper.id}>
                    <span>{paper.component}</span>
                    <small>{paper.kind} · Accepted</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.quiet}>
                {available
                  ? 'No paper components have been accepted for this year yet.'
                  : 'Accepted components are temporarily unavailable.'}
              </p>
            )}
            {!!selected?.pending && (
              <p className={styles.reviewNote}>
                {selected.pending} {selected.pending === 1 ? 'submission is' : 'submissions are'}{' '}
                awaiting superadmin review. Pending files are private and do not count as collected.
              </p>
            )}
            {selected?.accepted.length && !selected.complete ? (
              <p className={styles.reviewNote}>
                Some components are accepted. A superadmin still needs to confirm that all required
                papers are here.
              </p>
            ) : null}
            {selected?.complete && (
              <p className={styles.reviewNote}>
                A superadmin has confirmed this subject/year is collected. Only submit an additional
                document if it adds something missing.
              </p>
            )}

            <div className={styles.upload}>
              <h3>Contribute a component</h3>
              <p>
                Upload a question paper, mark scheme, or syllabus as a separate PDF. Include its
                paper number, session, or syllabus edition in the component name.
              </p>
              {!intakeEnabled && (
                <div className={styles.notice}>
                  <strong>File intake opens soon.</strong>
                  <p>
                    The archive interface is ready; private storage and superadmin access must be
                    configured before files can be received.
                  </p>
                </div>
              )}
              {!signedIn && intakeEnabled && (
                <div className={styles.notice}>
                  <p>
                    The collection is public. Sign in with your dojo account to contribute a paper.
                  </p>
                  <Link href="/login" className={styles.primary}>
                    Sign in to contribute
                  </Link>
                </div>
              )}
              <form ref={form} onSubmit={(event) => void submit(event)}>
                <fieldset disabled={busy || !!retryId || !available || !intakeEnabled || !signedIn}>
                  <legend className={styles.formLegend}>
                    Submit for {subjectName(subject)}, {year}
                  </legend>
                  <div className={styles.formGrid}>
                    <label>
                      Document type
                      <select
                        value={kind}
                        onChange={(event) => setKind(event.target.value as PaperKind)}
                      >
                        {PAPER_KINDS.map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Paper component
                      <input
                        name="component"
                        required
                        maxLength={100}
                        placeholder="e.g. Paper 1, May/June"
                      />
                    </label>
                  </div>
                  <label className={styles.fileLabel}>
                    Choose a PDF
                    <input
                      type="file"
                      name="file"
                      accept=".pdf,application/pdf"
                      required
                      onChange={(event) => {
                        setFile(event.target.files?.[0] ?? null);
                        setError('');
                      }}
                    />
                    <small>
                      {file
                        ? `${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`
                        : 'One component per file. PDF only, up to 20 MB. No student names, answers, or personal details.'}
                    </small>
                  </label>
                  <label>
                    Notes for the reviewer <span>(optional)</span>
                    <textarea
                      name="notes"
                      maxLength={1000}
                      rows={3}
                      placeholder="Missing pages, source, edition, or anything the reviewer should know."
                    />
                  </label>
                  <label className={styles.check}>
                    <input type="checkbox" name="permission" required />
                    <span>
                      I have permission to contribute this document. It contains no personal student
                      information, and I understand it will be reviewed before acceptance.
                    </span>
                  </label>
                </fieldset>
                {error && (
                  <p role="alert" className={styles.error}>
                    {error}
                  </p>
                )}
                {success && (
                  <p role="status" className={styles.success}>
                    {success}
                  </p>
                )}
                {retryId && (
                  <p className={styles.reviewNote}>
                    The file uploaded, but confirmation did not finish. Retry confirmation, not the
                    file upload. If it has expired, start a new submission.
                  </p>
                )}
                <div className={styles.formActions}>
                  <button
                    className={styles.primary}
                    type="submit"
                    disabled={busy || !available || !intakeEnabled || !signedIn}
                  >
                    {busy ? stage : retryId ? 'Retry confirmation' : 'Submit paper for review'}
                  </button>
                  {retryId && (
                    <button
                      type="button"
                      className={styles.secondary}
                      disabled={busy}
                      onClick={() => setRetryId(null)}
                    >
                      Start a new submission
                    </button>
                  )}
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
      <footer className={styles.footer}>
        <p>
          This community collection is not an official examination-board service. Only contribute
          material you have permission to share. Accepted files are not publicly downloadable in
          this release.
        </p>
        <Link href="/dashboard">Return to the dojo</Link>
      </footer>
    </div>
  );
}
