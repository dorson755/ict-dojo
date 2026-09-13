import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient, TABLE_NAME } from '../dynamodb';

export interface DocumentProjectAttempt {
  project_id: string;
  passed: boolean;
  completed_checks: string[];
  created_at: string;
  document_html?: string;
}

export class DocumentRepository {
  static async saveAttempt(userId: string, attempt: Omit<DocumentProjectAttempt, 'created_at'>) {
    const createdAt = new Date().toISOString();
    await dynamoClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `USER#${userId}`,
        SK: `DOCUMENT_PROJECT#${createdAt}`,
        ...attempt,
        created_at: createdAt,
      },
    }));
  }

  static async getAttempts(userId: string, limit = 20): Promise<DocumentProjectAttempt[]> {
    const response = await dynamoClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':sk': 'DOCUMENT_PROJECT#' },
      ScanIndexForward: false,
      Limit: limit,
    }));
    return (response.Items || []) as DocumentProjectAttempt[];
  }
}
