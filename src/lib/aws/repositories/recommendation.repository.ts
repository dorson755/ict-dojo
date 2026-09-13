import { dynamoClient, TABLE_NAME } from '../dynamodb';
import { QueryCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

interface StoredRecommendation {
  created_at?: string;
  priority?: number;
  is_acted_on?: boolean;
  [key: string]: unknown;
}

export class RecommendationRepository {
  static async getActiveRecommendation(userId: string): Promise<StoredRecommendation | null> {
    // In DynamoDB, we can query by PK = USER#userId and SK begins_with REC#
    // To only get active ones, we fetch all and filter in memory since is_acted_on isn't part of the key.
    
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'REC#',
      },
    });

    const response = await dynamoClient.send(command);
    const items = (response.Items || []) as StoredRecommendation[];
    
    const activeRecs = items.filter(item => !item.is_acted_on);
    
    if (activeRecs.length === 0) return null;
    
    // Sort by priority descending
    activeRecs.sort((a, b) => {
      const priorityDelta = (b.priority || 0) - (a.priority || 0);
      if (priorityDelta !== 0) return priorityDelta;
      return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    });
    
    return activeRecs[0];
  }

  static async markAsActedOn(userId: string, timestampId: string): Promise<void> {
    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `REC#${timestampId}`,
      },
      UpdateExpression: 'SET is_acted_on = :true, updated_at = :u',
      ExpressionAttributeValues: {
        ':true': true,
        ':u': new Date().toISOString(),
      },
    });

    await dynamoClient.send(command);
  }

  static async createRecommendation(userId: string, recommendation: Record<string, unknown>): Promise<void> {
    const timestamp = new Date().toISOString();
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `USER#${userId}`,
        SK: `REC#${timestamp}`,
        ...recommendation,
        is_acted_on: false,
        created_at: timestamp,
      },
    });

    await dynamoClient.send(command);
  }
}
