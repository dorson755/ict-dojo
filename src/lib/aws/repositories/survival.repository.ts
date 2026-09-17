import { PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient, TABLE_NAME } from '../dynamodb';

export type SurvivalMode = 'normal' | 'extreme';

export interface SurvivalScore {
  user_id: string;
  user_name: string;
  mode: SurvivalMode;
  starting_wpm: number;
  final_wpm: number;
  accuracy: number;
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
          SK: `SURVIVAL#${score.mode}#${score.starting_wpm}#${createdAt}`,
          ...score,
          created_at: createdAt,
        },
      }),
    );
  }

  static async getLeaderboard(mode: SurvivalMode, startingWpm: number, limit = 10): Promise<SurvivalScore[]> {
    const response = await dynamoClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        // Leaderboard entries are already stored under this primary key.
        // Querying GSI1 caused Survival mode to crash in environments where
        // the legacy table was provisioned without that index.
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `SURVIVAL_LEADERBOARD#${mode}#${startingWpm}`,
          ':sk': 'USER#',
        },
      }),
    );
    return ((response.Items || []) as SurvivalScore[])
      .sort((a, b) => {
        const scoreDelta = b.seconds_survived - a.seconds_survived;
        return scoreDelta || b.created_at.localeCompare(a.created_at);
      })
      .slice(0, limit);
  }

  static async upsertLeaderboardEntry(score: SurvivalScore) {
    await dynamoClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `SURVIVAL_LEADERBOARD#${score.mode}#${score.starting_wpm}`,
          SK: `USER#${score.user_id}`,
          GSI1PK: `SURVIVAL_LEADERBOARD#${score.mode}#${score.starting_wpm}`,
          GSI1SK: `SCORE#${score.seconds_survived.toString().padStart(8, '0')}#${score.created_at}`,
          user_id: score.user_id,
          user_name: score.user_name,
          mode: score.mode,
          starting_wpm: score.starting_wpm,
          final_wpm: score.final_wpm,
          words_typed: score.words_typed,
          seconds_survived: score.seconds_survived,
          created_at: score.created_at,
        },
      }),
    );
  }

  static async pruneLeaderboard(mode: SurvivalMode, startingWpm: number, keep = 10) {
    const entries = await this.getLeaderboard(mode, startingWpm, 1000);
    const toRemove = entries.slice(keep);
    for (const entry of toRemove) {
      await dynamoClient.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: `SURVIVAL_LEADERBOARD#${mode}#${startingWpm}`,
            SK: `USER#${entry.user_id}`,
          },
        }),
      );
    }
  }
}
