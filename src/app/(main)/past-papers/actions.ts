'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import {
  isExamSubject,
  isExamQualification,
  parsePaperMetadata,
  validExamYear,
  validSubmissionId,
} from '@/domains/exams/catalog';
import type { PaperSubmission } from '@/domains/exams/catalog';
import { requireExamUser } from '@/lib/exams/auth';
import {
  examIntakeEnabled,
  paperDownloadUrl,
  paperUploadForm,
  verifyPaperObject,
} from '@/lib/exams/storage';
import { ExamRepository } from '@/lib/aws/repositories/exam.repository';
import { ExamError, examAction } from '@/domains/exams/results';

export async function beginPaperUpload(raw: unknown) {
  return examAction(async () => {
    const user = await requireExamUser();
    if (!examIntakeEnabled())
      throw new ExamError('Paper intake is being prepared. Please check back soon.');
    const metadata = parsePaperMetadata(raw);
    const id = randomUUID();
    const submission: PaperSubmission = {
      ...metadata,
      id,
      owner: user.id,
      objectKey: `intake/${metadata.qualification}/${id}.pdf`,
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + 15 * 60_000,
      status: 'uploading',
    };
    const upload = await paperUploadForm(submission);
    try {
      await ExamRepository.begin(submission);
    } catch (error) {
      if (
        (error as Error).name === 'TransactionCanceledException' &&
        (error as { CancellationReasons?: { Code?: string }[] }).CancellationReasons?.[1]?.Code ===
          'ConditionalCheckFailed'
      )
        throw new ExamError(
          'The daily limit is 15 upload attempts per account. Please try again tomorrow.',
        );
      throw error;
    }
    return { id, upload };
  });
}
export async function finishPaperUpload(id: unknown, qualification: unknown = 'bgcse') {
  return examAction(async () => {
    const user = await requireExamUser();
    if (!isExamQualification(qualification)) throw new ExamError('Choose BJC or BGCSE.');
    if (!validSubmissionId(id)) throw new ExamError('Invalid upload.');
    const row = await ExamRepository.getSubmission(id, qualification);
    if (!row || row.owner !== user.id)
      throw new ExamError('This upload belongs to another account.');
    if (row.status !== 'uploading') return { success: true };
    if (row.expiresAt < Date.now())
      throw new ExamError('This upload expired. Start a new submission.');
    const version = await verifyPaperObject(row);
    await ExamRepository.submit(id, user.id, version, qualification);
    revalidatePath('/past-papers');
    revalidatePath('/past-papers/review');
    return { success: true };
  });
}
export async function reviewPaper(
  id: unknown,
  accept: unknown,
  note: unknown,
  checked: unknown,
  qualification: unknown = 'bgcse',
) {
  return examAction(async () => {
    const user = await requireExamUser(true);
    if (!isExamQualification(qualification)) throw new ExamError('Choose BJC or BGCSE.');
    if (
      !validSubmissionId(id) ||
      typeof accept !== 'boolean' ||
      typeof note !== 'string' ||
      note.trim().length > 500
    )
      throw new ExamError('Invalid review.');
    if (!accept && !note.trim()) throw new ExamError('Explain why this paper was not accepted.');
    if (accept && checked !== true)
      throw new ExamError('Confirm the document safety and content checks before accepting.');
    await ExamRepository.review(id, accept, user.id, note.trim(), qualification);
    revalidatePath('/past-papers');
    revalidatePath('/past-papers/review');
  });
}
export async function setYearCollected(
  subject: unknown,
  year: unknown,
  complete: unknown,
  confirmed: unknown,
  qualification: unknown = 'bgcse',
) {
  return examAction(async () => {
    const user = await requireExamUser(true);
    if (
      !isExamQualification(qualification) ||
      !isExamSubject(subject, qualification) ||
      !validExamYear(year) ||
      typeof complete !== 'boolean'
    )
      throw new ExamError('Choose a valid subject and year.');
    if (confirmed !== true) throw new ExamError('Confirm that you checked the year coverage.');
    await ExamRepository.setComplete(subject, year, complete, user.id, qualification);
    revalidatePath('/past-papers');
    revalidatePath('/past-papers/review');
  });
}
export async function downloadReviewPaper(id: unknown, qualification: unknown = 'bgcse') {
  return examAction(async () => {
    await requireExamUser(true);
    if (!isExamQualification(qualification)) throw new ExamError('Choose BJC or BGCSE.');
    if (!validSubmissionId(id)) throw new ExamError('Invalid upload.');
    const row = await ExamRepository.getSubmission(id, qualification);
    if (!row || row.status === 'uploading') throw new ExamError('Paper not found.');
    return { url: await paperDownloadUrl(row) };
  });
}
