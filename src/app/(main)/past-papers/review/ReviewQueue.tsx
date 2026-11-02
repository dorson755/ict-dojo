'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EXAM_QUALIFICATIONS, subjectsFor, subjectName } from '@/domains/exams/catalog';
import type {
  ExamCoverage,
  ExamQualification,
  ExamSubject,
  PaperSubmission,
} from '@/domains/exams/catalog';
import { downloadReviewPaper, reviewPaper, setYearCollected } from '../actions';
import { unwrapExamResult } from '@/domains/exams/results';
import styles from '../papers.module.css';

type ReviewRow = Pick<
  PaperSubmission,
  | 'qualification'
  | 'id'
  | 'subject'
  | 'year'
  | 'component'
  | 'kind'
  | 'filename'
  | 'size'
  | 'notes'
  | 'createdAt'
>;
function ReviewCard({
  row,
  run,
  busy,
}: {
  row: ReviewRow;
  run: (work: () => Promise<void>) => void;
  busy: boolean;
}) {
  const [note, setNote] = useState('');
  const [checked, setChecked] = useState(false);
  return (
    <article className={styles.reviewCard}>
      <h3>
        {EXAM_QUALIFICATIONS[row.qualification].label} · {subjectName(row.subject)}, {row.year}:{' '}
        {row.component}
      </h3>
      <p>
        {row.kind} · {row.filename} · {(row.size / 1024 / 1024).toFixed(1)} MB
      </p>
      <p>Submitted {new Date(row.createdAt).toLocaleDateString('en-GB', { timeZone: 'UTC' })}</p>
      {row.notes && <p>Contributor notes: {row.notes}</p>}
      <button
        type="button"
        className={styles.secondary}
        disabled={busy}
        onClick={() =>
          run(async () => {
            const result = unwrapExamResult(await downloadReviewPaper(row.id, row.qualification));
            window.location.assign(result.url);
          })
        }
      >
        Download privately for review
      </button>
      <p className={styles.reviewNote}>
        Uploads are untrusted. Scan the file and use a safe PDF viewer before opening it. A PDF
        signature check is not a malware scan. Download links expire after one minute.
      </p>
      <label>
        Review note
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={500}
          rows={2}
          disabled={busy}
          placeholder="Required when rejecting; kept private."
        />
      </label>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
          disabled={busy}
        />
        <span>
          I checked the document&apos;s safety, permission to use it, legibility, metadata, and
          whether it duplicates an accepted component.
        </span>
      </label>
      <div className={styles.formActions}>
        <button
          type="button"
          className={styles.primary}
          disabled={busy || !checked}
          onClick={() =>
            run(async () => {
              unwrapExamResult(await reviewPaper(row.id, true, note, checked, row.qualification));
            })
          }
        >
          Accept component
        </button>
        <button
          type="button"
          className={styles.secondary}
          disabled={busy || !note.trim()}
          onClick={() =>
            run(async () => {
              unwrapExamResult(await reviewPaper(row.id, false, note, false, row.qualification));
            })
          }
        >
          Reject component
        </button>
      </div>
    </article>
  );
}
export default function ReviewQueue({
  qualification,
  rows,
  coverage,
  years,
}: {
  qualification: ExamQualification;
  rows: ReviewRow[];
  coverage: ExamCoverage[];
  years: number[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState<ExamSubject>('mathematics');
  const [year, setYear] = useState(years[0]);
  const [confirmed, setConfirmed] = useState(false);
  const selected = coverage.find(
    (row) => row.qualification === qualification && row.subject === subject && row.year === year,
  );
  async function run(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await work();
      setMessage('Action completed. The collection has been refreshed.');
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'This action did not finish. Refresh and try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {message && (
        <p role="status" className={styles.success}>
          {message}
        </p>
      )}
      <h2>Awaiting review</h2>
      <p className={styles.quiet}>
        Up to 30 submissions per page. The queue may take a moment to reflect a review.
      </p>
      <div className={styles.queue}>
        {rows.map((row) => (
          <ReviewCard key={row.id} row={row} busy={busy} run={(work) => void run(work)} />
        ))}
        {!rows.length && <p className={styles.notice}>No submissions are waiting in this queue.</p>}
      </div>
      <section className={styles.completeControl}>
        <h2>Confirm a complete subject/year</h2>
        <p>
          Check the official paper requirements for this subject and year. Mark schemes and
          syllabuses do not replace missing question-paper components.
        </p>
        <div className={styles.formGrid}>
          <label>
            Subject
            <select
              value={subject}
              disabled={busy}
              onChange={(event) => {
                setSubject(event.target.value as ExamSubject);
                setConfirmed(false);
              }}
            >
              {subjectsFor(qualification).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Year
            <select
              value={year}
              disabled={busy}
              onChange={(event) => {
                setYear(Number(event.target.value));
                setConfirmed(false);
              }}
            >
              {years.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
        <ul className={styles.componentList}>
          {selected?.accepted.map((paper) => (
            <li key={paper.id}>
              <span>{paper.component}</span>
              <small>{paper.kind}</small>
            </li>
          ))}
        </ul>
        {!selected?.accepted.length && (
          <p className={styles.reviewNote}>No accepted components for this subject/year.</p>
        )}
        <p className={styles.reviewNote}>
          Public status: {selected?.complete ? 'Collected' : 'Not yet collected'}.{' '}
          {selected?.pending ?? 0} pending submissions.
        </p>
        {!selected?.complete && (
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={confirmed}
              disabled={busy}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>
              I verified that every required question-paper component for this{' '}
              {EXAM_QUALIFICATIONS[qualification].label} subject and year has been accepted.
            </span>
          </label>
        )}
        <div className={styles.formActions}>
          {selected?.complete ? (
            <button
              type="button"
              className={styles.secondary}
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  unwrapExamResult(
                    await setYearCollected(subject, year, false, true, qualification),
                  );
                })
              }
            >
              Reopen collection for this year
            </button>
          ) : (
            <button
              type="button"
              className={styles.primary}
              disabled={
                busy ||
                !confirmed ||
                !selected?.accepted.some((paper) => paper.kind === 'Question paper')
              }
              onClick={() =>
                void run(async () => {
                  unwrapExamResult(
                    await setYearCollected(subject, year, true, confirmed, qualification),
                  );
                  setConfirmed(false);
                })
              }
            >
              Mark year collected
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
