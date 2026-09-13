import { dynamoClient, TABLE_NAME } from '../dynamodb';
import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

export interface SkillMastery {
  student_id: string;
  skill_id: string;
  mastery_score: number;
  mastery_level: string;
  practice_count: number;
  last_practiced_at?: string;
  skills?: { name: string }; // Denormalized for display
}

export class MasteryRepository {
  static async getMastery(userId: string, skillId: string): Promise<SkillMastery | null> {
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `MASTERY#${skillId}`,
      },
    });

    const response = await dynamoClient.send(command);
    if (!response.Item) return null;

    return response.Item as SkillMastery;
  }

  static async getTopMasteredSkills(userId: string, limit: number = 5): Promise<SkillMastery[]> {
    // In DynamoDB, we can query by PK = USER#userId and SK begins_with MASTERY#
    // To sort by mastery_score, we'd ideally need a Global Secondary Index (GSI), 
    // or we fetch all and sort in memory if the number of skills per user is small.
    // For now, fetch all mastery items and sort in memory.
    
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'MASTERY#',
      },
    });

    const response = await dynamoClient.send(command);
    const items = (response.Items || []) as SkillMastery[];
    
    return items.sort((a, b) => b.mastery_score - a.mastery_score).slice(0, limit);
  }

  static async getAllMastery(userId: string): Promise<SkillMastery[]> {
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'MASTERY#',
      },
    });

    const response = await dynamoClient.send(command);
    return (response.Items || []) as SkillMastery[];
  }

  static async upsertMastery(userId: string, mastery: SkillMastery): Promise<void> {
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `USER#${userId}`,
        SK: `MASTERY#${mastery.skill_id}`,
        ...mastery,
        updated_at: new Date().toISOString(),
      },
    });

    await dynamoClient.send(command);
  }

  static async logMasteryHistory(userId: string, history: Record<string, unknown>): Promise<void> {
    const timestamp = new Date().toISOString();
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `USER#${userId}`,
        SK: `MASTERY_HISTORY#${timestamp}`,
        ...history,
        created_at: timestamp,
      },
    });

    await dynamoClient.send(command);
  }
}
