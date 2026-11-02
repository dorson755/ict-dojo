import { GetCommand, QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient, TABLE_NAME } from '../dynamodb';
import type { ExamCoverage, ExamSubject, PaperSubmission } from '@/domains/exams/catalog';
import { ExamError } from '@/domains/exams/results';

const CATALOG = 'EXAM#BGCSE#CATALOG';
const submissionKey = (id: string) => ({ PK: `EXAM#BGCSE#SUBMISSION#${id}`, SK: 'META' });
const coverageKey = (subject: ExamSubject, year: number) => ({
  PK: CATALOG,
  SK: `${subject}#${year}`,
});
const statusIndex = (status: string, id: string) => ({
  GSI1PK: `EXAM#BGCSE#STATUS#${status}`,
  GSI1SK: id,
});
async function read<T>(Key: { PK: string; SK: string }): Promise<T | null> {
  const response = await dynamoClient.send(
    new GetCommand({ TableName: TABLE_NAME, Key, ConsistentRead: true }),
  );
  return (response.Item as T | undefined) ?? null;
}
function coveragePut(previous: ExamCoverage | null, next: ExamCoverage) {
  return {
    TableName: TABLE_NAME,
    Item: {
      ...coverageKey(next.subject, next.year),
      ...next,
      version: (previous?.version ?? 0) + 1,
    },
    ConditionExpression: previous ? '#v = :v' : 'attribute_not_exists(PK)',
    ...(previous
      ? {
          ExpressionAttributeNames: { '#v': 'version' },
          ExpressionAttributeValues: { ':v': previous.version },
        }
      : {}),
  };
}
async function retryConflict(work: () => Promise<void>) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await work();
      return;
    } catch (error) {
      if ((error as Error).name !== 'TransactionCanceledException' || attempt === 2) throw error;
    }
  }
}
function emptyCoverage(subject: ExamSubject, year: number): ExamCoverage {
  return { subject, year, version: 0, pending: 0, accepted: [], complete: false };
}
export class ExamRepository {
  static getSubmission(id: string) {
    return read<PaperSubmission>(submissionKey(id));
  }
  static getCoverage(subject: ExamSubject, year: number) {
    return read<ExamCoverage>(coverageKey(subject, year));
  }
  static async catalog(): Promise<ExamCoverage[]> {
    const rows: ExamCoverage[] = [];
    let cursor: Record<string, unknown> | undefined;
    do {
      const response = await dynamoClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'PK = :pk',
          ExpressionAttributeValues: { ':pk': CATALOG },
          ConsistentRead: true,
          ExclusiveStartKey: cursor,
        }),
      );
      // Explicit projection prevents contributor IDs and storage keys reaching the public page.
      for (const row of response.Items ?? [])
        rows.push({
          subject: row.subject,
          year: row.year,
          version: row.version,
          pending: row.pending,
          complete: row.complete,
          accepted: row.accepted.map((paper: { id: string; component: string; kind: string }) => ({
            id: paper.id,
            component: paper.component,
            kind: paper.kind,
          })),
        } as ExamCoverage);
      cursor = response.LastEvaluatedKey;
    } while (cursor);
    return rows;
  }
  static async begin(submission: PaperSubmission) {
    const day = submission.createdAt.slice(0, 10);
    // A durable per-account budget bounds abandoned uploads as well as completed ones.
    await dynamoClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: TABLE_NAME,
              Item: { ...submissionKey(submission.id), ...submission },
              ConditionExpression: 'attribute_not_exists(PK)',
            },
          },
          {
            Update: {
              TableName: TABLE_NAME,
              Key: { PK: `USER#${submission.owner}`, SK: `EXAM_UPLOAD_BUDGET#${day}` },
              UpdateExpression: 'ADD #count :one',
              ConditionExpression: 'attribute_not_exists(#count) OR #count < :limit',
              ExpressionAttributeNames: { '#count': 'count' },
              ExpressionAttributeValues: { ':one': 1, ':limit': 15 },
            },
          },
        ],
      }),
    );
  }
  static async submit(id: string, owner: string, versionId: string) {
    await retryConflict(async () => {
      const row = await this.getSubmission(id);
      if (!row || row.owner !== owner)
        throw new ExamError('This upload belongs to another account.');
      if (row.status !== 'uploading') return;
      if (row.expiresAt < Date.now())
        throw new ExamError('This upload expired. Start a new submission.');
      const previous = await this.getCoverage(row.subject, row.year);
      const next = previous ?? emptyCoverage(row.subject, row.year);
      await dynamoClient.send(
        new TransactWriteCommand({
          TransactItems: [
            { Put: coveragePut(previous, { ...next, pending: next.pending + 1 }) },
            {
              Update: {
                TableName: TABLE_NAME,
                Key: submissionKey(id),
                UpdateExpression:
                  'SET #status = :pending, versionId = :version, GSI1PK = :index, GSI1SK = :id',
                ConditionExpression: '#status = :uploading AND #owner = :owner',
                ExpressionAttributeNames: { '#status': 'status', '#owner': 'owner' },
                ExpressionAttributeValues: {
                  ':pending': 'pending',
                  ':uploading': 'uploading',
                  ':owner': owner,
                  ':version': versionId,
                  ':index': statusIndex('pending', id).GSI1PK,
                  ':id': id,
                },
              },
            },
          ],
        }),
      );
    });
  }
  static async reviewQueue(cursor?: string): Promise<{ rows: PaperSubmission[]; next?: string }> {
    const response = await dynamoClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: { ':pk': statusIndex('pending', '').GSI1PK },
        Limit: 30,
        ...(cursor
          ? { ExclusiveStartKey: { ...submissionKey(cursor), ...statusIndex('pending', cursor) } }
          : {}),
      }),
    );
    return {
      rows: (response.Items ?? []) as PaperSubmission[],
      next: response.LastEvaluatedKey?.GSI1SK,
    };
  }
  static async review(id: string, accept: boolean, reviewer: string, note: string) {
    await retryConflict(async () => {
      const row = await this.getSubmission(id);
      if (!row || row.status !== 'pending')
        throw new ExamError('This paper has already been reviewed. Refresh the queue.');
      const previous = await this.getCoverage(row.subject, row.year);
      if (!previous || previous.pending < 1)
        throw new ExamError('Coverage changed. Refresh before reviewing.');
      if (accept && previous.accepted.length >= 100)
        throw new ExamError('This year already has 100 accepted components. Check for duplicates.');
      const accepted = accept
        ? [...previous.accepted, { id, component: row.component, kind: row.kind }]
        : previous.accepted;
      await dynamoClient.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Put: coveragePut(previous, { ...previous, pending: previous.pending - 1, accepted }),
            },
            {
              Update: {
                TableName: TABLE_NAME,
                Key: submissionKey(id),
                UpdateExpression:
                  'SET #status = :next, reviewedBy = :reviewer, reviewedAt = :at, reviewNote = :note REMOVE GSI1PK, GSI1SK',
                ConditionExpression: '#status = :pending',
                ExpressionAttributeNames: { '#status': 'status' },
                ExpressionAttributeValues: {
                  ':next': accept ? 'accepted' : 'rejected',
                  ':pending': 'pending',
                  ':reviewer': reviewer,
                  ':at': new Date().toISOString(),
                  ':note': note,
                },
              },
            },
          ],
        }),
      );
    });
  }
  static async setComplete(
    subject: ExamSubject,
    year: number,
    complete: boolean,
    reviewer: string,
  ) {
    await retryConflict(async () => {
      const previous = await this.getCoverage(subject, year);
      if (
        !previous ||
        (complete && !previous.accepted.some((paper) => paper.kind === 'Question paper'))
      )
        throw new ExamError(
          'Accept at least one question-paper component before marking this year collected.',
        );
      await dynamoClient.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Put: {
                ...coveragePut(previous, { ...previous, complete }),
                Item: {
                  ...coveragePut(previous, { ...previous, complete }).Item,
                  coverageReviewedBy: reviewer,
                  coverageReviewedAt: new Date().toISOString(),
                },
              },
            },
          ],
        }),
      );
    });
  }
}
