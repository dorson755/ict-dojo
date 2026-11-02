import { GetObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { MAX_PAPER_BYTES, type PaperSubmission } from '@/domains/exams/catalog';
import { ExamError } from '@/domains/exams/results';

const client = new S3Client({
  region: process.env.APP_REGION || process.env.AWS_REGION || 'us-east-2',
  ...(process.env.RUNTIME_AWS_ACCESS_KEY_ID && process.env.RUNTIME_AWS_SECRET_ACCESS_KEY
    ? {
        credentials: {
          accessKeyId: process.env.RUNTIME_AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.RUNTIME_AWS_SECRET_ACCESS_KEY,
        },
      }
    : {}),
});
export function examIntakeEnabled() {
  return (
    process.env.EXAM_INTAKE_ENABLED === 'true' &&
    !!process.env.EXAM_PAPERS_BUCKET &&
    !!process.env.EXAM_SUPERADMIN_IDS?.trim()
  );
}
function bucket() {
  if (!examIntakeEnabled())
    throw new ExamError('Paper intake is being prepared. Please check back soon.');
  return process.env.EXAM_PAPERS_BUCKET!;
}
export async function paperUploadForm(submission: PaperSubmission) {
  return createPresignedPost(client, {
    Bucket: bucket(),
    Key: submission.objectKey,
    Expires: 300,
    Fields: {
      'Content-Type': 'application/pdf',
      'x-amz-server-side-encryption': 'AES256',
      success_action_status: '204',
    },
    Conditions: [
      ['content-length-range', submission.size, submission.size],
      ['eq', '$Content-Type', 'application/pdf'],
      ['eq', '$x-amz-server-side-encryption', 'AES256'],
    ],
  });
}
export async function verifyPaperObject(submission: PaperSubmission): Promise<string> {
  const Bucket = bucket();
  const object = await client.send(new HeadObjectCommand({ Bucket, Key: submission.objectKey }));
  if (!object.VersionId || object.VersionId === 'null')
    throw new ExamError('Private paper storage must have versioning enabled.');
  if (
    object.ContentLength !== submission.size ||
    object.ContentLength > MAX_PAPER_BYTES ||
    object.ContentType !== 'application/pdf'
  )
    throw new ExamError('The uploaded document does not match this submission.');
  const bytes = await client.send(
    new GetObjectCommand({
      Bucket,
      Key: submission.objectKey,
      VersionId: object.VersionId,
      Range: 'bytes=0-7',
    }),
  );
  const header = await bytes.Body?.transformToByteArray();
  if (!header || !Buffer.from(header).toString('ascii').startsWith('%PDF-'))
    throw new ExamError('This file is not a PDF. Export it as a PDF and try again.');
  return object.VersionId;
}
export async function paperDownloadUrl(submission: PaperSubmission) {
  if (!submission.versionId) throw new ExamError('This upload is not ready for review.');
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket(),
      Key: submission.objectKey,
      VersionId: submission.versionId,
      ResponseContentType: 'application/octet-stream',
      ResponseContentDisposition: `attachment; filename="bgcse-${submission.subject}-${submission.year}-${submission.id}.pdf"`,
    }),
    { expiresIn: 60 },
  );
}
