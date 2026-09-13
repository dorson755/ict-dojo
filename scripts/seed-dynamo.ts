import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import {
  TYPING_DEPENDENCIES,
  TYPING_DOMAIN_ID,
  TYPING_SKILLS,
  TYPING_SKILL_IDS,
} from '../src/domains/typing/catalog';

const region = process.env.APP_REGION || process.env.AWS_REGION || 'us-east-2';
const client = new DynamoDBClient({ region });
const dynamoClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.DYNAMODB_TABLE_NAME || 'ict-dojo-main';
const createdAt = new Date().toISOString();

const exercises = [
  {
    id: 'typing-keyboard-map',
    skillId: TYPING_SKILL_IDS.keyboardFamiliarity,
    title: 'Find the keys',
    passage: 'a s d f j k l ; q w e r u i o p',
    hint: 'Find each key before you press it. Accuracy comes first.',
    difficulty: 1,
    grades: [1, 2],
  },
  {
    id: 'typing-home-row-basics',
    skillId: TYPING_SKILL_IDS.homeRow,
    title: 'Home row basics',
    passage: 'asdf jkl; asdf jkl; sad dad ask falls',
    hint: 'Return your fingers to the home row after every reach.',
    difficulty: 1,
    grades: [1, 12],
  },
  {
    id: 'typing-top-row-intro',
    skillId: TYPING_SKILL_IDS.topRow,
    title: 'Top row introduction',
    passage: 'qwer uiop type wire quiet power',
    hint: 'Reach up, then return home. Keep your wrists relaxed.',
    difficulty: 2,
    grades: [1, 12],
  },
  {
    id: 'typing-bottom-row-intro',
    skillId: TYPING_SKILL_IDS.bottomRow,
    title: 'Bottom row introduction',
    passage: 'zxcv bnm, zoom can mix bacon',
    hint: 'Reach down without moving your whole hand.',
    difficulty: 2,
    grades: [1, 12],
  },
  {
    id: 'typing-common-words',
    skillId: TYPING_SKILL_IDS.commonWords,
    title: 'Everyday words',
    passage: 'the and that with have from they will make time',
    hint: 'Aim for an even pace. Do not race the clock.',
    difficulty: 2,
    grades: [1, 12],
  },
  {
    id: 'typing-sentence-fluency',
    skillId: TYPING_SKILL_IDS.sentenceFluency,
    title: 'Smooth sentences',
    passage: 'Small steps each day build strong typing habits.',
    hint: 'Keep your eyes on the text and find a steady rhythm.',
    difficulty: 3,
    grades: [2, 12],
  },
  {
    id: 'typing-capitalization',
    skillId: TYPING_SKILL_IDS.capitalization,
    title: 'Capital letters',
    passage: 'Maya And Jordan Practice Typing Every Day.',
    hint: 'Use the opposite-hand Shift key whenever you can.',
    difficulty: 3,
    grades: [3, 12],
  },
  {
    id: 'typing-punctuation',
    skillId: TYPING_SKILL_IDS.punctuation,
    title: 'Punctuation control',
    passage: '“Ready, set, type!” said Maya. Then she smiled.',
    hint: 'Pause only long enough to find each punctuation mark.',
    difficulty: 4,
    grades: [3, 12],
  },
  {
    id: 'typing-numbers',
    skillId: TYPING_SKILL_IDS.numbers,
    title: 'Numbers and symbols',
    passage: 'Room 24 has 18 laptops, 6 tablets, and 3 printers.',
    hint: 'Reach for numbers deliberately, then return to home row.',
    difficulty: 4,
    grades: [4, 12],
  },
  {
    id: 'typing-coding-syntax',
    skillId: TYPING_SKILL_IDS.codingSyntax,
    title: 'Code characters',
    passage: 'const total = items.length; if (total > 0) { return total; }',
    hint: 'Every character matters in code, especially brackets and symbols.',
    difficulty: 5,
    grades: [6, 12],
  },
];

async function put(item: Record<string, unknown>) {
  await dynamoClient.send(new PutCommand({ TableName: tableName, Item: item }));
}

async function seed() {
  console.log(`Seeding ${tableName} in ${region}...`);

  await put({
    PK: `DOMAIN#${TYPING_DOMAIN_ID}`,
    SK: 'META',
    GSI1PK: `DOMAIN#${TYPING_DOMAIN_ID}`,
    GSI1SK: 'META',
    id: TYPING_DOMAIN_ID,
    name: 'Touch Typing',
    slug: 'touch-typing',
    description: 'Build accurate, confident touch typing habits.',
    is_active: true,
    sort_order: 1,
    created_at: createdAt,
  });

  for (const skill of TYPING_SKILLS) {
    await put({
      PK: `SKILL#${skill.id}`,
      SK: 'META',
      GSI1PK: `DOMAIN#${TYPING_DOMAIN_ID}`,
      GSI1SK: `SKILL#${String(skill.difficulty_baseline).padStart(2, '0')}#${skill.id}`,
      ...skill,
      created_at: createdAt,
    });
  }

  for (const dependency of TYPING_DEPENDENCIES) {
    await put({
      PK: `DOMAIN#${TYPING_DOMAIN_ID}`,
      SK: `DEPENDENCY#${dependency.from_skill_id}#${dependency.to_skill_id}`,
      ...dependency,
      created_at: createdAt,
    });
  }

  for (const exercise of exercises) {
    const [gradeMin, gradeMax] = exercise.grades;
    await put({
      PK: `DOMAIN#${TYPING_DOMAIN_ID}`,
      SK: `EXERCISE#${exercise.id}`,
      GSI1PK: `DOMAIN#${TYPING_DOMAIN_ID}`,
      GSI1SK: `EXERCISE#${String(exercise.difficulty).padStart(2, '0')}#${exercise.id}`,
      id: exercise.id,
      domain_id: TYPING_DOMAIN_ID,
      skill_ids: [exercise.skillId],
      title: exercise.title,
      difficulty: exercise.difficulty,
      difficulty_metadata: {
        passage_length: exercise.passage.length,
        has_punctuation: /[.,!?;:'"]/u.test(exercise.passage),
        has_capitalization: /[A-Z]/u.test(exercise.passage),
        has_numbers: /\d/u.test(exercise.passage),
        has_symbols: /[{}()[\]<>+=]/u.test(exercise.passage),
        vocabulary_level: exercise.difficulty < 3 ? 'basic' : 'intermediate',
      },
      content: { passage: exercise.passage, hint: exercise.hint },
      is_ai_generated: false,
      grade_level_min: gradeMin,
      grade_level_max: gradeMax,
      created_at: createdAt,
    });
  }

  console.log(`Seeded ${TYPING_SKILLS.length} skills, ${TYPING_DEPENDENCIES.length} dependencies, and ${exercises.length} exercises.`);
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
