import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient, TABLE_NAME } from '../dynamodb';

export interface PersonalRecord {
  metric: 'best_wpm' | 'best_accuracy';
  value: number;
  achieved_at: string;
}

export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
  reward_xp: number;
  date: string;
}

export class ProgressRepository {
  static async updatePersonalRecord(
    userId: string,
    metric: PersonalRecord['metric'],
    value: number
  ): Promise<boolean> {
    const key = { PK: `USER#${userId}`, SK: `RECORD#${metric}` };
    const existing = await dynamoClient.send(new GetCommand({ TableName: TABLE_NAME, Key: key }));
    const previous = Number(existing.Item?.value ?? 0);
    if (value <= previous) return false;

    await dynamoClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: { ...key, metric, value, achieved_at: new Date().toISOString() },
    }));
    return true;
  }

  static async getPersonalRecords(userId: string): Promise<PersonalRecord[]> {
    const response = await dynamoClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':sk': 'RECORD#' },
    }));
    return (response.Items || []) as PersonalRecord[];
  }

  static async updateDailyAccuracyQuest(userId: string, accuracy: number): Promise<DailyQuest> {
    const date = new Date().toISOString().slice(0, 10);
    const key = { PK: `USER#${userId}`, SK: `QUEST#daily-accuracy#${date}` };
    const existing = await dynamoClient.send(new GetCommand({ TableName: TABLE_NAME, Key: key }));
    const quest = existing.Item as DailyQuest | undefined;
    const progress = Math.min(2, (quest?.progress ?? 0) + (accuracy >= 95 ? 1 : 0));
    const nextQuest: DailyQuest = {
      id: 'daily-accuracy',
      title: 'Precision practice',
      description: 'Finish 2 sessions with at least 95% accuracy.',
      target: 2,
      progress,
      completed: progress >= 2,
      reward_xp: 75,
      date,
    };
    await dynamoClient.send(new PutCommand({ TableName: TABLE_NAME, Item: { ...key, ...nextQuest } }));
    return nextQuest;
  }

  static async getTodaysQuest(userId: string): Promise<DailyQuest | null> {
    const date = new Date().toISOString().slice(0, 10);
    const response = await dynamoClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: `QUEST#daily-accuracy#${date}` },
    }));
    return (response.Item as DailyQuest | undefined) ?? null;
  }
}
