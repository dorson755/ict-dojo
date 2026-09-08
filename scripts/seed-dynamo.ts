import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const region = process.env.AWS_REGION || 'us-east-1';
const client = new DynamoDBClient({ region });
const dynamoClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'ict-dojo-main';

const HOME_ROW_SKILL_ID = '00000000-0000-0000-0000-000000000001';
const TOP_ROW_SKILL_ID = '00000000-0000-0000-0000-000000000002';
const BOTTOM_ROW_SKILL_ID = '00000000-0000-0000-0000-000000000003';
const NUMBERS_SKILL_ID = '00000000-0000-0000-0000-000000000004';
const SHIFT_SKILL_ID = '00000000-0000-0000-0000-000000000005';
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

  await dynamoClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: `SKILL#${BOTTOM_ROW_SKILL_ID}`,
      SK: 'META',
      name: 'Bottom Row',
      domain_id: DOMAIN_ID,
      difficulty_baseline: 2,
    }
  }));

  await dynamoClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: `SKILL#${NUMBERS_SKILL_ID}`,
      SK: 'META',
      name: 'Numbers & Symbols',
      domain_id: DOMAIN_ID,
      difficulty_baseline: 3,
    }
  }));

  await dynamoClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: `SKILL#${SHIFT_SKILL_ID}`,
      SK: 'META',
      name: 'Shift Key Mastery',
      domain_id: DOMAIN_ID,
      difficulty_baseline: 3,
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

  const exercise3 = {
    PK: `DOMAIN#${DOMAIN_ID}`,
    SK: `EXERCISE#102`,
    title: 'Bottom Row Basics',
    skill_ids: [BOTTOM_ROW_SKILL_ID],
    difficulty: 2,
    grade_level_min: 1,
    grade_level_max: 12,
    content: {
      passage: 'zxcv bnm, zxcv bnm, zxcv bnm,'
    }
  };

  await dynamoClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: exercise3
  }));

  const exercise4 = {
    PK: `DOMAIN#${DOMAIN_ID}`,
    SK: `EXERCISE#103`,
    title: 'Number Row',
    skill_ids: [NUMBERS_SKILL_ID],
    difficulty: 3,
    grade_level_min: 1,
    grade_level_max: 12,
    content: {
      passage: '12345 67890 12345 67890'
    }
  };

  await dynamoClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: exercise4
  }));

  const exercise5 = {
    PK: `DOMAIN#${DOMAIN_ID}`,
    SK: `EXERCISE#104`,
    title: 'Shift Key Practice',
    skill_ids: [SHIFT_SKILL_ID],
    difficulty: 3,
    grade_level_min: 1,
    grade_level_max: 12,
    content: {
      passage: 'The Quick Brown Fox Jumps Over The Lazy Dog'
    }
  };

  await dynamoClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: exercise5
  }));

  console.log('Done seeding.');
}

seed().catch(console.error);
