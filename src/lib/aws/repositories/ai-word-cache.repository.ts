import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient, TABLE_NAME } from '../dynamodb';

export interface CachedWordList {
  words: string[];
  bossLine: string;
  created_at: string;
}

/**
 * Shared, non-identifying AI word lists. Keys hold only a belt, letter targets,
 * and a slot number, so the item count stays small and fixed; slots are
 * overwritten instead of accumulating.
 */
export class AiWordCacheRepository {
  static async get(key: string): Promise<CachedWordList | null> {
    const response = await dynamoClient.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { PK: 'AI_WORDS', SK: key } }),
    );
    return (response.Item as CachedWordList | undefined) ?? null;
  }

  static async put(key: string, list: { words: string[]; bossLine: string }): Promise<void> {
    await dynamoClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: 'AI_WORDS',
          SK: key,
          words: list.words,
          bossLine: list.bossLine,
          created_at: new Date().toISOString(),
        },
      }),
    );
  }
}
