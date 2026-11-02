jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3');
  return { ...actual, S3Client: jest.fn(() => ({ send: jest.fn() })) };
});
jest.mock('@aws-sdk/s3-presigned-post', () => ({ createPresignedPost: jest.fn() }));
jest.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: jest.fn() }));
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  examIntakeEnabled,
  paperDownloadUrl,
  paperUploadForm,
  verifyPaperObject,
} from '../storage';
import type { PaperSubmission } from '@/domains/exams/catalog';

const send = (S3Client as jest.Mock).mock.results[0].value.send as jest.Mock;
const original = { ...process.env };
const row: PaperSubmission = {
  qualification: 'bgcse',
  id: 'id',
  owner: 'user',
  objectKey: 'intake/bgcse/id.pdf',
  subject: 'mathematics',
  year: 2020,
  component: 'Paper 1',
  kind: 'Question paper',
  notes: '',
  filename: 'paper.pdf',
  size: 100,
  status: 'uploading',
  createdAt: 'now',
  expiresAt: Date.now() + 10000,
};
beforeEach(() => {
  jest.clearAllMocks();
  process.env.EXAM_PAPERS_BUCKET = 'private-test-bucket';
  process.env.EXAM_SUPERADMIN_IDS = 'owner';
  process.env.EXAM_INTAKE_ENABLED = 'true';
  send.mockImplementation(async (command) =>
    command instanceof HeadObjectCommand
      ? {
          VersionId: 'version-1',
          ContentLength: row.size,
          ContentType: 'application/pdf',
        }
      : { Body: { transformToByteArray: async () => Buffer.from('%PDF-1.7') } },
  );
});
afterAll(() => {
  process.env = original;
});
it('disables intake unless all three server settings are present', () => {
  expect(examIntakeEnabled()).toBe(true);
  delete process.env.EXAM_SUPERADMIN_IDS;
  expect(examIntakeEnabled()).toBe(false);
});
it('signs only the allocated key and exact allowed size for five minutes', async () => {
  await paperUploadForm(row);
  expect(createPresignedPost).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      Bucket: 'private-test-bucket',
      Key: row.objectKey,
      Expires: 300,
      Conditions: expect.arrayContaining([
        ['content-length-range', 100, 100],
        ['eq', '$Content-Type', 'application/pdf'],
      ]),
    }),
  );
});
it('pins and inspects the immutable version rather than an overwritable key', async () => {
  expect(await verifyPaperObject(row)).toBe('version-1');
  const command = send.mock.calls[1][0] as GetObjectCommand;
  expect(command.input).toMatchObject({
    Key: row.objectKey,
    VersionId: 'version-1',
    Range: 'bytes=0-7',
  });
});
it.each([
  { VersionId: 'null', ContentLength: 100, ContentType: 'application/pdf' },
  { VersionId: 'v', ContentLength: 101, ContentType: 'application/pdf' },
  { VersionId: 'v', ContentLength: 100, ContentType: 'text/html' },
])('rejects unversioned or mismatched uploaded objects %#', async (object) => {
  send.mockResolvedValueOnce(object);
  await expect(verifyPaperObject(row)).rejects.toThrow();
});
it('rejects an impostor PDF and downloads only as a short-lived attachment', async () => {
  send.mockImplementation(async (command) =>
    command instanceof HeadObjectCommand
      ? { VersionId: 'v', ContentLength: 100, ContentType: 'application/pdf' }
      : { Body: { transformToByteArray: async () => Buffer.from('<script>') } },
  );
  await expect(verifyPaperObject(row)).rejects.toThrow('not a PDF');
  await paperDownloadUrl({ ...row, versionId: 'v', filename: 'unsafe"name.pdf' });
  const command = (getSignedUrl as jest.Mock).mock.calls[0][1] as GetObjectCommand;
  expect(command.input).toMatchObject({
    VersionId: 'v',
    ResponseContentType: 'application/octet-stream',
  });
  expect(command.input.ResponseContentDisposition).not.toContain('unsafe');
  expect((getSignedUrl as jest.Mock).mock.calls[0][2]).toEqual({ expiresIn: 60 });
});
