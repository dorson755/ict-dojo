import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const region = process.env.AWS_REGION || 'us-east-1';
const client = new DynamoDBClient({ region });
const dynamoClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.NEXT_PUBLIC_DYNAMODB_TABLE_NAME || 'ict-dojo';

const HOME_ROW_SKILL_ID = '00000000-0000-0000-0000-000000000001';
const TOP_ROW_SKILL_ID = '00000000-0000-0000-0000-000000000002';
const DOMAIN_ID = '1';

async function seed() {
  console.log('Seeding DynamoDB...');

  // 1. Seed Domain
  await dynamoClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: `DOMAIN#${DOMAIN_ID}`,
      SK: 'META',
      name: 'Touch Typing',
      slug: 'touch-typing',
      is_active: true,
    }
  }));

  // 2. Seed Skills
  await dynamoClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: `SKILL#${HOME_ROW_SKILL_ID}`,
      SK: 'META',
      name: 'Home Row',
      domain_id: DOMAIN_ID,
      difficulty_baseline: 1,
    }
  }));

  await dynamoClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: `SKILL#${TOP_ROW_SKILL_ID}`,
      SK: 'META',
      name: 'Top Row',
      domain_id: DOMAIN_ID,
      difficulty_baseline: 2,
    }
  }));

  // 3. Seed Exercises
  const exercise1 = {
    PK: `DOMAIN#${DOMAIN_ID}`,
    SK: `EXERCISE#100`,
    title: 'Home Row Basics',
    skill_ids: [HOME_ROW_SKILL_ID],
    difficulty: 1,
    grade_level_min: 1,
    grade_level_max: 12,
    content: {
      passage: 'asdf jkl; asdf jkl; asdf jkl;'
    }
  };

  await dynamoClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: exercise1
  }));

  const exercise2 = {
    PK: `DOMAIN#${DOMAIN_ID}`,
    SK: `EXERCISE#101`,
    title: 'Top Row Introduction',
    skill_ids: [TOP_ROW_SKILL_ID],
    difficulty: 2,
    grade_level_min: 1,
    grade_level_max: 12,
    content: {
      passage: 'qwer uiop qwer uiop qwer uiop'
    }
  };

  await dynamoClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: exercise2
  }));

  console.log('Done seeding.');
}

seed().catch(console.error);
