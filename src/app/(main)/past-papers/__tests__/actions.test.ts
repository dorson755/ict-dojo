jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/exams/auth', () => ({ requireExamUser: jest.fn() }));
jest.mock('@/lib/exams/storage', () => ({
  examIntakeEnabled: jest.fn(),
  paperDownloadUrl: jest.fn(),
  paperUploadForm: jest.fn(),
  verifyPaperObject: jest.fn(),
}));
jest.mock('@/lib/aws/repositories/exam.repository', () => ({
  ExamRepository: {
    begin: jest.fn(),
    getSubmission: jest.fn(),
    submit: jest.fn(),
    review: jest.fn(),
    setComplete: jest.fn(),
  },
}));
import { requireExamUser } from '@/lib/exams/auth';
import {
  examIntakeEnabled,
  paperDownloadUrl,
  paperUploadForm,
  verifyPaperObject,
} from '@/lib/exams/storage';
import { ExamRepository } from '@/lib/aws/repositories/exam.repository';
import { ExamError } from '@/domains/exams/results';
import {
  beginPaperUpload,
  downloadReviewPaper,
  finishPaperUpload,
  reviewPaper,
  setYearCollected,
} from '../actions';

const id = '12345678-1234-4234-8234-123456789012';
const metadata = {
  subject: 'mathematics',
  year: 2020,
  component: 'Paper 1',
  kind: 'Question paper',
  notes: '',
  filename: 'paper.pdf',
  size: 100,
  permission: true,
};
beforeEach(() => {
  jest.resetAllMocks();
  (requireExamUser as jest.Mock).mockResolvedValue({ id: 'contributor', superadmin: false });
  (examIntakeEnabled as jest.Mock).mockReturnValue(true);
  (paperUploadForm as jest.Mock).mockResolvedValue({ url: 'https://test.invalid', fields: {} });
  (verifyPaperObject as jest.Mock).mockResolvedValue('version-1');
  (ExamRepository.getSubmission as jest.Mock).mockResolvedValue({
    ...metadata,
    id,
    owner: 'contributor',
    status: 'uploading',
    expiresAt: Date.now() + 10000,
  });
});
it('fails closed for anonymous mutations and downloads', async () => {
  (requireExamUser as jest.Mock).mockRejectedValue(new ExamError('Sign in'));
  for (const result of await Promise.all([
    beginPaperUpload(metadata),
    finishPaperUpload(id),
    reviewPaper(id, true, '', true),
    setYearCollected('mathematics', 2020, true, true),
    downloadReviewPaper(id),
  ]))
    expect(result.ok).toBe(false);
  expect(ExamRepository.begin).not.toHaveBeenCalled();
  expect(ExamRepository.review).not.toHaveBeenCalled();
  expect(paperDownloadUrl).not.toHaveBeenCalled();
});
it('never grants review/download/coverage authority from client input', async () => {
  (requireExamUser as jest.Mock).mockImplementation(async (admin) => {
    if (admin) throw new ExamError('Superadmin required');
    return { id: 'contributor' };
  });
  expect((await reviewPaper(id, true, '', true)).ok).toBe(false);
  expect((await setYearCollected('mathematics', 2020, true, true)).ok).toBe(false);
  expect((await downloadReviewPaper(id)).ok).toBe(false);
  expect(ExamRepository.review).not.toHaveBeenCalled();
});
it('disables intake before signing or persisting an upload', async () => {
  (examIntakeEnabled as jest.Mock).mockReturnValue(false);
  expect((await beginPaperUpload(metadata)).ok).toBe(false);
  expect(paperUploadForm).not.toHaveBeenCalled();
  expect(ExamRepository.begin).not.toHaveBeenCalled();
});
it('allocates IDs, ownership, and a private key server-side', async () => {
  const result = await beginPaperUpload({
    ...metadata,
    owner: 'attacker',
    objectKey: 'public/evil',
  });
  expect(result.ok).toBe(true);
  expect(ExamRepository.begin).toHaveBeenCalledWith(
    expect.objectContaining({
      owner: 'contributor',
      objectKey: expect.stringMatching(/^intake\/bgcse\/[a-f0-9-]+\.pdf$/),
      status: 'uploading',
    }),
  );
});
it('checks ownership before storage access and pins the verified version', async () => {
  (ExamRepository.getSubmission as jest.Mock).mockResolvedValueOnce({ owner: 'other' });
  expect((await finishPaperUpload(id)).ok).toBe(false);
  expect(verifyPaperObject).not.toHaveBeenCalled();
  expect((await finishPaperUpload(id)).ok).toBe(true);
  expect(ExamRepository.submit).toHaveBeenCalledWith(id, 'contributor', 'version-1', 'bgcse');
});
it('requires explicit acceptance attestation, rejection notes, and year confirmation', async () => {
  expect((await reviewPaper(id, true, '', false)).ok).toBe(false);
  expect((await reviewPaper(id, false, '', false)).ok).toBe(false);
  expect((await setYearCollected('mathematics', 2020, true, false)).ok).toBe(false);
  expect(ExamRepository.review).not.toHaveBeenCalled();
  expect(ExamRepository.setComplete).not.toHaveBeenCalled();
});
it('returns safe service errors rather than storage internals', async () => {
  (ExamRepository.begin as jest.Mock).mockRejectedValue(new Error('Credentials SECRET'));
  expect(JSON.stringify(await beginPaperUpload(metadata))).not.toContain('SECRET');
});
it('reports quota exhaustion only when the budget condition actually failed', async () => {
  (ExamRepository.begin as jest.Mock).mockRejectedValueOnce(
    Object.assign(new Error('cancelled'), {
      name: 'TransactionCanceledException',
      CancellationReasons: [{ Code: 'None' }, { Code: 'ConditionalCheckFailed' }],
    }),
  );
  expect(await beginPaperUpload(metadata)).toEqual({
    ok: false,
    error: expect.stringContaining('daily limit'),
  });
  (ExamRepository.begin as jest.Mock).mockRejectedValueOnce(
    Object.assign(new Error('conflict'), { name: 'TransactionCanceledException' }),
  );
  expect(await beginPaperUpload(metadata)).toEqual({
    ok: false,
    error: expect.not.stringContaining('daily limit'),
  });
});
it('allocates BJC storage paths and passes the qualification through confirmation', async () => {
  expect(
    (await beginPaperUpload({ ...metadata, qualification: 'bjc', subject: 'general-science' })).ok,
  ).toBe(true);
  expect(ExamRepository.begin).toHaveBeenCalledWith(
    expect.objectContaining({
      qualification: 'bjc',
      objectKey: expect.stringMatching(/^intake\/bjc\/[a-f0-9-]+\.pdf$/),
    }),
  );
  await finishPaperUpload(id, 'bjc');
  expect(ExamRepository.getSubmission).toHaveBeenCalledWith(id, 'bjc');
  expect(ExamRepository.submit).toHaveBeenCalledWith(id, 'contributor', 'version-1', 'bjc');
});
it('rejects cross-qualification subjects when completing coverage', async () => {
  expect((await setYearCollected('chemistry', 2020, true, true, 'bjc')).ok).toBe(false);
  expect((await setYearCollected('general-science', 2020, true, true, 'bgcse')).ok).toBe(false);
  expect(ExamRepository.setComplete).not.toHaveBeenCalled();
  expect((await setYearCollected('mathematics', 2020, true, true, 'bjc')).ok).toBe(true);
  expect(ExamRepository.setComplete).toHaveBeenCalledWith(
    'mathematics',
    2020,
    true,
    'contributor',
    'bjc',
  );
});
it('validates the qualification on confirmation, reviews, and private downloads', async () => {
  expect((await finishPaperUpload(id, '__proto__')).ok).toBe(false);
  expect((await reviewPaper(id, true, '', true, 'invalid')).ok).toBe(false);
  expect((await downloadReviewPaper(id, 'invalid')).ok).toBe(false);
  expect(ExamRepository.getSubmission).not.toHaveBeenCalled();
});
