import { dynamoClient, TABLE_NAME } from '../dynamodb';
import { QueryCommand, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

export class ExerciseRepository {
  static async getExercisesByDomain(domainId: string): Promise<any[]> {
    // In DynamoDB, exercises could have PK = DOMAIN#domainId, SK = EXERCISE#exerciseId
    // Or we scan/query based on a GSI.
    // Assuming PK = DOMAIN#domainId, SK begins_with EXERCISE#
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `DOMAIN#${domainId}`,
        ':sk': 'EXERCISE#',
      },
    });

    const response = await dynamoClient.send(command);
    return response.Items || [];
  }

  static async getActiveDomainBySlug(slug: string): Promise<any | null> {
    // Without a GSI on slug, we scan for domains and filter by slug.
    // For small number of domains, scan is fine.
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :pk) AND SK = :sk AND slug = :slug AND is_active = :active',
      ExpressionAttributeValues: {
        ':pk': 'DOMAIN#',
        ':sk': 'META',
        ':slug': slug,
        ':active': true,
      },
    });

    const response = await dynamoClient.send(command);
    return response.Items && response.Items.length > 0 ? response.Items[0] : null;
  }

  static async logSession(userId: string, sessionData: any): Promise<void> {
    const timestamp = new Date().toISOString();
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `USER#${userId}`,
        SK: `SESSION#${timestamp}`,
        ...sessionData,
        created_at: timestamp,
      },
    });

    await dynamoClient.send(command);
  }
}
