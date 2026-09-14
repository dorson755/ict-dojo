import { PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient, TABLE_NAME } from '../dynamodb';

export interface SurvivalScore {
  user_id: string;
  user_name: string;
  starting_wpm: number;
  final_wpm: number;
  words_typed: number;
  seconds_survived: number;
  created_at: string;
}

export class SurvivalRepository {
  static async saveScore(score: Omit<SurvivalScore, 'created_at'>) {
    const createdAt = new Date().toISOString();
    await dynamoClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `USER#${score.user_id}`,
          SK: `SURVIVAL#${score.starting_wpm}#${createdAt}`,
          ...score,
          created_at: createdAt,
        },
      }),
    );
  }

  static async getLeaderboard(startingWpm: number, limit = 10): Promise<SurvivalScore[]> {
    const response = await dynamoClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `SURVIVAL_LEADERBOARD#${startingWpm}`,
          ':sk': 'SCORE#',
        },
        ScanIndexForward: false,
        Limit: limit,
      }),
    );
    return (response.Items || []) as SurvivalScore[];
  }

  static async upsertLeaderboardEntry(score: SurvivalScore) {
    await dynamoClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `SURVIVAL_LEADERBOARD#${score.starting_wpm}`,
          SK: `USER#${score.user_id}`,
          GSI1PK: `SURVIVAL_LEADERBOARD#${score.starting_wpm}`,
          GSI1SK: `SCORE#${score.seconds_survived.toString().padStart(8, '0')}#${score.created_at}`,
          user_id: score.user_id,
          user_name: score.user_name,
          starting_wpm: score.starting_wpm,
          final_wpm: score.final_wpm,
          words_typed: score.words_typed,
          seconds_survived: score.seconds_survived,
          created_at: score.created_at,
        },
      }),
    );
  }

  static async pruneLeaderboard(startingWpm: number, keep = 10) {
    const entries = await this.getLeaderboard(startingWpm, 1000);
    const toRemove = entries.slice(keep);
    for (const entry of toRemove) {
      await dynamoClient.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: `SURVIVAL_LEADERBOARD#${startingWpm}`,
            SK: `USER#${entry.user_id}`,
          },
        }),
      );
    }
  }
}
