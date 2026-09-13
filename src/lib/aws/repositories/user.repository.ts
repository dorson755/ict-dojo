import { dynamoClient, TABLE_NAME } from '../dynamodb';
import { GetCommand, PutCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

export interface StudentProfile {
  id: string;
  grade_level?: number;
  display_name?: string;
  xp_total?: number;
  platform_level?: number;
  streak_count?: number;
  last_practice_date?: string;
  linked_student_ids?: string[];
}

export interface TypingDNA {
  student_id: string;
  baseline_wpm?: number;
  avg_wpm?: number;
  avg_accuracy?: number;
  last_assessed_at?: string;
  sessions_analyzed?: number;
  weak_keys?: Record<string, number>;
}

export class UserRepository {
  static async getStudentProfiles(excludeUserId?: string): Promise<StudentProfile[]> {
    const response = await dynamoClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'SK = :profile',
      ExpressionAttributeValues: { ':profile': 'PROFILE' },
    }));

    return (response.Items || [])
      .map((item) => ({
        id: String(item.PK || '').replace(/^USER#/, ''),
        grade_level: item.grade_level,
        display_name: item.display_name ?? item.name,
        xp_total: item.xp_total ?? 0,
        platform_level: item.platform_level ?? 1,
        streak_count: item.streak_count ?? 0,
        last_practice_date: item.last_practice_date,
        linked_student_ids: item.linked_student_ids ?? [],
      }))
      .filter((profile) => profile.id && profile.id !== excludeUserId && profile.id !== 'undefined');
  }

  static async getProfile(userId: string): Promise<StudentProfile | null> {
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PROFILE',
      },
    });

    const response = await dynamoClient.send(command);
    if (!response.Item) return null;
    
    return {
      id: userId,
      grade_level: response.Item.grade_level,
      display_name: response.Item.display_name,
      xp_total: response.Item.xp_total ?? 0,
      platform_level: response.Item.platform_level ?? 1,
      streak_count: response.Item.streak_count ?? 0,
      last_practice_date: response.Item.last_practice_date,
      linked_student_ids: response.Item.linked_student_ids ?? [],
    };
  }

  static async updateProfile(userId: string, gradeLevel: number, displayName?: string): Promise<void> {
    // Fetch existing item first so we don't overwrite XP, level, streak, etc.
    const existing = await dynamoClient.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { PK: `USER#${userId}`, SK: 'PROFILE' } })
    );
    const prev = existing.Item || {};

    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...prev,
        PK: `USER#${userId}`,
        SK: 'PROFILE',
        grade_level: gradeLevel,
        ...(displayName !== undefined ? { display_name: displayName } : {}),
        xp_total: prev.xp_total ?? 0,
        platform_level: prev.platform_level ?? 1,
        streak_count: prev.streak_count ?? 0,
        updated_at: new Date().toISOString(),
        created_at: prev.created_at ?? new Date().toISOString(),
      },
    });

    await dynamoClient.send(command);
  }

  /**
   * Award XP and update platform level atomically.
   * Uses ADD for xp_total (atomic increment) and SET for platform_level.
   */
  static async awardXp(
    userId: string,
    xpGained: number,
    newLevel: number
  ): Promise<void> {
    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PROFILE',
      },
      UpdateExpression:
        'ADD xp_total :xp SET platform_level = :lvl, updated_at = :u',
      ExpressionAttributeValues: {
        ':xp': xpGained,
        ':lvl': newLevel,
        ':u': new Date().toISOString(),
      },
    });

    await dynamoClient.send(command);
  }

  /**
   * Update the user's daily practice streak.
   */
  static async updateStreak(
    userId: string,
    streak: number,
    practiceDate: string
  ): Promise<void> {
    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PROFILE',
      },
      UpdateExpression:
        'SET streak_count = :s, last_practice_date = :d, updated_at = :u',
      ExpressionAttributeValues: {
        ':s': streak,
        ':d': practiceDate,
        ':u': new Date().toISOString(),
      },
    });

    await dynamoClient.send(command);
  }

  static async getTypingDNA(userId: string): Promise<TypingDNA | null> {
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: 'DNA#TYPING',
      },
    });

    const response = await dynamoClient.send(command);
    if (!response.Item) return null;
    
    return {
      student_id: userId,
      baseline_wpm: response.Item.baseline_wpm,
      avg_wpm: response.Item.avg_wpm,
      avg_accuracy: response.Item.avg_accuracy,
      last_assessed_at: response.Item.last_assessed_at,
      sessions_analyzed: response.Item.sessions_analyzed,
      weak_keys: response.Item.weak_keys || {},
    };
  }

  static async upsertTypingDNA(userId: string, dna: Partial<TypingDNA>): Promise<void> {
    // In DynamoDB, PutCommand overwrites. To upsert specific fields safely without overwriting others,
    // we use UpdateCommand with dynamic expressions, or just PutCommand if we are providing all fields.
    // Since diagnostic initializes it, we'll use UpdateCommand.
    
    let updateExp = 'SET updated_at = :u';
    const expVals: Record<string, unknown> = {
      ':u': new Date().toISOString(),
    };

    if (dna.baseline_wpm !== undefined) {
      updateExp += ', baseline_wpm = :bw';
      expVals[':bw'] = dna.baseline_wpm;
    }
    if (dna.avg_wpm !== undefined) {
      updateExp += ', avg_wpm = :aw';
      expVals[':aw'] = dna.avg_wpm;
    }
    if (dna.avg_accuracy !== undefined) {
      updateExp += ', avg_accuracy = :aa';
      expVals[':aa'] = dna.avg_accuracy;
    }
    if (dna.last_assessed_at !== undefined) {
      updateExp += ', last_assessed_at = :la';
      expVals[':la'] = dna.last_assessed_at;
    }
    if (dna.sessions_analyzed !== undefined) {
      updateExp += ', sessions_analyzed = :sa';
      expVals[':sa'] = dna.sessions_analyzed;
    }
    if (dna.weak_keys !== undefined) {
      updateExp += ', weak_keys = :wk';
      expVals[':wk'] = dna.weak_keys;
    }

    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: 'DNA#TYPING',
      },
      UpdateExpression: updateExp,
      ExpressionAttributeValues: expVals,
    });

    await dynamoClient.send(command);
  }
}
