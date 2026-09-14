import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const region = process.env.APP_REGION || process.env.AWS_REGION || 'us-east-2';
const client = new DynamoDBClient({ region });
const dynamoClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.DYNAMODB_TABLE_NAME || 'ict-dojo-main';
const userId = process.env.RECALCULATE_USER_ID;

if (!userId) {
  console.error('Set RECALCULATE_USER_ID to a student user id.');
  process.exitCode = 1;
}

interface SessionItem {
  PK: string;
  SK: string;
  wpm?: number;
  accuracy?: number;
  created_at?: string;
}

async function recalculateForUser(targetUserId: string) {
  console.log(`Recalculating records for ${targetUserId}...`);

  const response = await dynamoClient.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${targetUserId}`,
        ':sk': 'SESSION#',
      },
    }),
  );

  const sessions = (response.Items || []) as SessionItem[];
  if (!sessions.length) {
    console.log('No sessions found.');
    return;
  }

  let bestWpm = 0;
  let bestAccuracy = 0;
  let bestWpmAt = '';
  let bestAccuracyAt = '';

  sessions.forEach((session) => {
    const wpm = Number(session.wpm || 0);
    const accuracy = Number(session.accuracy || 0);
    const createdAt = String(session.created_at || new Date().toISOString());

    if (wpm > bestWpm) {
      bestWpm = wpm;
      bestWpmAt = createdAt;
    }
    if (accuracy > bestAccuracy) {
      bestAccuracy = accuracy;
      bestAccuracyAt = createdAt;
    }
  });

  await dynamoClient.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        PK: `USER#${targetUserId}`,
        SK: 'RECORD#best_wpm',
        metric: 'best_wpm',
        value: bestWpm,
        achieved_at: bestWpmAt,
      },
    }),
  );

  await dynamoClient.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        PK: `USER#${targetUserId}`,
        SK: 'RECORD#best_accuracy',
        metric: 'best_accuracy',
        value: bestAccuracy,
        achieved_at: bestAccuracyAt,
      },
    }),
  );

  console.log(`Updated best WPM: ${bestWpm}, best accuracy: ${bestAccuracy}% from ${sessions.length} sessions.`);
}

async function main() {
  if (!userId) return;
  await recalculateForUser(userId);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
