import { QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import type { Skill, SkillDependency } from '@/types/platform';
import { dynamoClient, TABLE_NAME } from '../dynamodb';

const CATALOG_INDEX = process.env.DYNAMODB_CATALOG_INDEX || 'GSI1';

export class SkillRepository {
  static async getSkillsByDomain(domainId: string): Promise<Skill[]> {
    try {
      const response = await dynamoClient.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: CATALOG_INDEX,
        KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `DOMAIN#${domainId}`,
          ':sk': 'SKILL#',
        },
      }));
      return (response.Items || []) as Skill[];
    } catch {
      // Existing tables created before the catalog index can still serve the MVP.
      const response = await dynamoClient.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'begins_with(PK, :skill) AND domain_id = :domain',
        ExpressionAttributeValues: { ':skill': 'SKILL#', ':domain': domainId },
      }));
      return (response.Items || []) as Skill[];
    }
  }

  static async getDependenciesByDomain(domainId: string): Promise<SkillDependency[]> {
    const response = await dynamoClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `DOMAIN#${domainId}`,
        ':sk': 'DEPENDENCY#',
      },
    }));

    return (response.Items || []) as SkillDependency[];
  }

  static async getSkill(domainId: string, skillId: string): Promise<Skill | null> {
    const skills = await this.getSkillsByDomain(domainId);
    return skills.find((skill) => skill.id === skillId) ?? null;
  }
}
