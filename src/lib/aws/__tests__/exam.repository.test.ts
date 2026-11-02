jest.mock('../dynamodb', () => ({ TABLE_NAME: 'test-table', dynamoClient: { send: jest.fn() } }));
import { GetCommand, QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient } from '../dynamodb';
import { ExamRepository } from '../repositories/exam.repository';
import type { ExamCoverage, PaperSubmission } from '@/domains/exams/catalog';

const send = dynamoClient.send as jest.Mock;
const submission: PaperSubmission = {
  qualification: 'bgcse',
  id: '12345678-1234-4234-8234-123456789012',
  owner: 'contributor',
  subject: 'mathematics',
  year: 2020,
  component: 'Paper 1',
  kind: 'Question paper',
  notes: '',
  filename: 'maths.pdf',
  size: 100,
  objectKey: 'intake/bgcse/id.pdf',
  createdAt: new Date().toISOString(),
  expiresAt: Date.now() + 100000,
  status: 'uploading',
};
let stored: PaperSubmission;
let coverage: ExamCoverage | null;
let transactions: TransactWriteCommand[];
beforeEach(() => {
  jest.resetAllMocks();
  stored = { ...submission };
  coverage = null;
  transactions = [];
  send.mockImplementation(async (command) => {
    if (command instanceof GetCommand) {
      expect(command.input.ConsistentRead).toBe(true);
      return { Item: command.input.Key!.SK === 'META' ? stored : coverage };
    }
    if (command instanceof TransactWriteCommand) {
      transactions.push(command);
      for (const write of command.input.TransactItems ?? []) {
        if (write.Put?.Item?.PK === 'EXAM#BGCSE#CATALOG')
          coverage = write.Put.Item as unknown as ExamCoverage;
        if (write.Update?.Key?.SK === 'META') {
          const values = write.Update.ExpressionAttributeValues!;
          stored = {
            ...stored,
            status: values[':next'] ?? values[':pending'],
            versionId: values[':version'] ?? stored.versionId,
          };
        }
      }
      return {};
    }
    return {};
  });
});
it('budgets every upload attempt and creates its draft atomically', async () => {
  await ExamRepository.begin(submission);
  const writes = transactions[0].input.TransactItems!;
  expect(writes).toHaveLength(2);
  expect(writes[0].Put?.ConditionExpression).toBe('attribute_not_exists(PK)');
  expect(writes[1].Update?.Key?.PK).toBe('USER#contributor');
  expect(writes[1].Update?.ExpressionAttributeValues?.[':limit']).toBe(15);
});
it('confirmation is idempotent and never marks a year collected', async () => {
  await ExamRepository.submit(submission.id, submission.owner, 'v1');
  expect(coverage).toMatchObject({ pending: 1, accepted: [], complete: false });
  expect(stored).toMatchObject({ status: 'pending', versionId: 'v1' });
  await ExamRepository.submit(submission.id, submission.owner, 'v2');
  expect(transactions).toHaveLength(1);
  expect(stored.versionId).toBe('v1');
});
it('rejects foreign or expired confirmations without writes', async () => {
  await expect(ExamRepository.submit(submission.id, 'intruder', 'v')).rejects.toThrow(
    'another account',
  );
  stored.expiresAt = 0;
  await expect(ExamRepository.submit(submission.id, submission.owner, 'v')).rejects.toThrow(
    'expired',
  );
  expect(transactions).toHaveLength(0);
});
it('accepts only the component, consumes pending once, and guards both writes', async () => {
  await ExamRepository.submit(submission.id, submission.owner, 'v');
  transactions = [];
  await ExamRepository.review(submission.id, true, 'superadmin', 'Checked');
  expect(coverage).toMatchObject({
    pending: 0,
    complete: false,
    accepted: [{ id: submission.id, component: 'Paper 1', kind: 'Question paper' }],
  });
  const writes = transactions[0].input.TransactItems!;
  expect(
    writes.every((write) => write.Put?.ConditionExpression || write.Update?.ConditionExpression),
  ).toBe(true);
  expect(writes[1].Update?.UpdateExpression).toContain('REMOVE GSI1PK, GSI1SK');
  await expect(ExamRepository.review(submission.id, true, 'superadmin', '')).rejects.toThrow(
    'already been reviewed',
  );
  expect(transactions).toHaveLength(1);
});
it('rejects a component without exposing it or completing coverage', async () => {
  await ExamRepository.submit(submission.id, submission.owner, 'v');
  await ExamRepository.review(submission.id, false, 'superadmin', 'Missing pages');
  expect(coverage).toMatchObject({ pending: 0, accepted: [], complete: false });
  expect(stored.status).toBe('rejected');
});
it('requires an accepted question paper before manual completion and supports reopening', async () => {
  await expect(ExamRepository.setComplete('mathematics', 2020, true, 'admin')).rejects.toThrow();
  coverage = {
    qualification: 'bgcse',
    subject: 'mathematics',
    year: 2020,
    version: 1,
    pending: 0,
    complete: false,
    accepted: [{ id: 'a', component: 'Syllabus', kind: 'Syllabus' }],
  };
  await expect(ExamRepository.setComplete('mathematics', 2020, true, 'admin')).rejects.toThrow();
  coverage.accepted.push({ id: 'b', component: 'Paper 1', kind: 'Question paper' });
  await ExamRepository.setComplete('mathematics', 2020, true, 'admin');
  expect(coverage!.complete).toBe(true);
  await ExamRepository.setComplete('mathematics', 2020, false, 'admin');
  expect(coverage!.complete).toBe(false);
});
it('retries a transaction conflict from a fresh snapshot', async () => {
  const implementation = send.getMockImplementation()!;
  let conflict = true;
  send.mockImplementation(async (command) => {
    if (command instanceof TransactWriteCommand && conflict) {
      conflict = false;
      throw Object.assign(new Error('conflict'), { name: 'TransactionCanceledException' });
    }
    return implementation(command);
  });
  await ExamRepository.submit(submission.id, submission.owner, 'v');
  expect(coverage!.pending).toBe(1);
  expect(
    send.mock.calls.filter(([command]) => command instanceof TransactWriteCommand),
  ).toHaveLength(2);
});
it('paginates the public catalog and strips internal fields', async () => {
  const publicRow = {
    subject: 'mathematics',
    year: 2020,
    version: 1,
    pending: 0,
    accepted: [],
    complete: false,
  };
  send
    .mockResolvedValueOnce({
      Items: [{ ...publicRow, owner: 'private', objectKey: 'secret', coverageReviewedBy: 'admin' }],
      LastEvaluatedKey: { PK: 'next', SK: 'next' },
    })
    .mockResolvedValueOnce({ Items: [{ ...publicRow, year: 2021 }] });
  const result = await ExamRepository.catalog();
  expect(result).toHaveLength(2);
  expect(JSON.stringify(result)).not.toMatch(/private|secret|coverageReviewedBy/);
  expect((send.mock.calls[1][0] as QueryCommand).input.ExclusiveStartKey).toEqual({
    PK: 'next',
    SK: 'next',
  });
});
it('keeps BJC catalog, submissions, queue, and coverage in separate namespaces', async () => {
  send.mockResolvedValue({});
  await ExamRepository.catalog('bjc');
  await ExamRepository.getSubmission(submission.id, 'bjc');
  await ExamRepository.getCoverage('mathematics', 2020, 'bjc');
  await ExamRepository.reviewQueue(undefined, 'bjc');
  expect((send.mock.calls[0][0] as QueryCommand).input.ExpressionAttributeValues).toEqual({
    ':pk': 'EXAM#BJC#CATALOG',
  });
  expect((send.mock.calls[1][0] as GetCommand).input.Key?.PK).toBe(
    `EXAM#BJC#SUBMISSION#${submission.id}`,
  );
  expect((send.mock.calls[2][0] as GetCommand).input.Key?.PK).toBe('EXAM#BJC#CATALOG');
  expect((send.mock.calls[3][0] as QueryCommand).input.ExpressionAttributeValues).toEqual({
    ':pk': 'EXAM#BJC#STATUS#pending',
  });
});
it('reads legacy BGCSE rows without changing their keys', async () => {
  const legacy: Partial<PaperSubmission> = { ...submission };
  delete legacy.qualification;
  send.mockResolvedValue({ Item: legacy });
  expect(await ExamRepository.getSubmission(submission.id)).toMatchObject({
    qualification: 'bgcse',
  });
  expect((send.mock.calls[0][0] as GetCommand).input.Key?.PK).toBe(
    `EXAM#BGCSE#SUBMISSION#${submission.id}`,
  );
});
it('confirms and accepts BJC papers without writing any BGCSE coverage', async () => {
  stored = { ...submission, qualification: 'bjc' };
  const implementation = send.getMockImplementation()!;
  send.mockImplementation(async (command) => {
    const result = await implementation(command);
    if (command instanceof TransactWriteCommand) {
      for (const write of command.input.TransactItems ?? []) {
        if (write.Put?.Item?.PK === 'EXAM#BJC#CATALOG')
          coverage = write.Put.Item as unknown as ExamCoverage;
      }
    }
    return result;
  });
  await ExamRepository.submit(submission.id, submission.owner, 'v', 'bjc');
  await ExamRepository.review(submission.id, true, 'superadmin', 'Checked', 'bjc');
  expect(coverage).toMatchObject({
    qualification: 'bjc',
    pending: 0,
    complete: false,
    accepted: [{ id: submission.id }],
  });
  for (const command of transactions) {
    expect(JSON.stringify(command.input)).not.toContain('BGCSE');
  }
});
