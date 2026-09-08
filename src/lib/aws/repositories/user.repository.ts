import { dynamoClient, TABLE_NAME } from '../dynamodb';
import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

export interface StudentProfile {
  id: string;
  grade_level?: number;
  display_name?: string;
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
    };
  }

  static async updateProfile(userId: string, gradeLevel: number): Promise<void> {
    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PROFILE',
      },
      UpdateExpression: 'SET grade_level = :g, updated_at = :u',
      ExpressionAttributeValues: {
        ':g': gradeLevel,
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
    const expVals: Record<string, any> = {
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
