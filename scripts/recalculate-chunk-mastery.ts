import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { TYPING_CHUNKS, getChunkById } from '../src/domains/typing/chunks';
import { TYPING_SKILL_IDS } from '../src/domains/typing/catalog';
import { MasteryService } from '../src/domains/shared/mastery-service';
import type { SkillMastery } from '../src/types/platform';

const region = process.env.APP_REGION || process.env.AWS_REGION || 'us-east-2';
const client = new DynamoDBClient({ region });
const dynamoClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.DYNAMODB_TABLE_NAME || 'ict-dojo-main';
const userId = process.env.RECALCULATE_USER_ID;

if (!userId) {
  console.error('Set RECALCULATE_USER_ID to a student user id.');
  process.exitCode = 1;
}

const CHUNK_MASTERY_PREFIX = 'chunk:';

interface SessionItem {
  exercise_id?: string;
  wpm?: number;
  accuracy?: number;
  created_at?: string;
}

interface RebuiltMastery {
  mastery_score: number;
  mastery_level: string;
  practice_count: number;
  last_practiced_at: string;
}

async function put(item: Record<string, unknown>) {
  await dynamoClient.send(new PutCommand({ TableName: tableName, Item: item }));
}

async function recalculateForUser(targetUserId: string) {
  console.log(`Recalculating chunk mastery for ${targetUserId}...`);

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

  // Replay chunk sessions in chronological order. Mixed drills (chunk-mixed)
  // count toward the overall practice count but credit no single chunk.
  const chunkSessions = ((response.Items || []) as SessionItem[])
    .filter((session) => typeof session.exercise_id === 'string' && session.exercise_id.startsWith('chunk-'))
    .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')));

  if (!chunkSessions.length) {
    console.log('No chunk sessions found.');
    return;
  }

  const masteryService = new MasteryService();
  const perChunk = new Map<string, RebuiltMastery>();

  for (const session of chunkSessions) {
    const chunkId = String(session.exercise_id).slice('chunk-'.length);
    const chunk = getChunkById(chunkId);
    if (!chunk) continue;

    const sessionScore =
      Number(session.accuracy || 0) * 0.7 + Math.min(Number(session.wpm || 0) / 40, 1) * 30;
    const current = perChunk.get(chunkId);
    const snapshot: SkillMastery | undefined = current
      ? {
          id: `${CHUNK_MASTERY_PREFIX}${chunkId}`,
          student_id: targetUserId,
          skill_id: `${CHUNK_MASTERY_PREFIX}${chunkId}`,
          mastery_score: current.mastery_score,
          mastery_level: current.mastery_level as SkillMastery['mastery_level'],
          practice_count: current.practice_count,
          last_practiced_at: current.last_practiced_at,
          updated_at: '',
        }
      : undefined;

    const { newScore, newLevel } = masteryService.processAttempt(
      snapshot,
      targetUserId,
      `${CHUNK_MASTERY_PREFIX}${chunkId}`,
      sessionScore,
    );
    perChunk.set(chunkId, {
      mastery_score: newScore,
      mastery_level: newLevel,
      practice_count: (current?.practice_count ?? 0) + 1,
      last_practiced_at: String(session.created_at || new Date().toISOString()),
    });
  }

  for (const [chunkId, mastery] of perChunk) {
    await put({
      PK: `USER#${targetUserId}`,
      SK: `MASTERY#${CHUNK_MASTERY_PREFIX}${chunkId}`,
      student_id: targetUserId,
      skill_id: `${CHUNK_MASTERY_PREFIX}${chunkId}`,
      mastery_score: mastery.mastery_score,
      mastery_level: mastery.mastery_level,
      practice_count: mastery.practice_count,
      last_practiced_at: mastery.last_practiced_at,
      skills: { name: `Chunks · ${getChunkById(chunkId)?.label ?? chunkId}` },
      updated_at: new Date().toISOString(),
    });
  }

  // Overall Chunks skill: average across every catalog chunk (zeros for
  // unattempted), "mastered" only when every chunk is mastered.
  const sumScores = TYPING_CHUNKS.reduce(
    (sum, chunk) => sum + (perChunk.get(chunk.id)?.mastery_score ?? 0),
    0,
  );
  const overallScore = Number((sumScores / TYPING_CHUNKS.length).toFixed(2));
  const scoreLevel = masteryService.getMasteryLevelFromScore(overallScore);
  const allChunksMastered = TYPING_CHUNKS.every(
    (chunk) => perChunk.get(chunk.id)?.mastery_level === 'mastered',
  );
  const overallLevel = allChunksMastered ? 'mastered' : scoreLevel === 'mastered' ? 'strong' : scoreLevel;

  await put({
    PK: `USER#${targetUserId}`,
    SK: `MASTERY#${TYPING_SKILL_IDS.chunks}`,
    student_id: targetUserId,
    skill_id: TYPING_SKILL_IDS.chunks,
    mastery_score: overallScore,
    mastery_level: overallLevel,
    practice_count: chunkSessions.length,
    last_practiced_at: String(chunkSessions[chunkSessions.length - 1].created_at || new Date().toISOString()),
    skills: { name: 'Chunks' },
    updated_at: new Date().toISOString(),
  });

  console.log(`Rebuilt ${perChunk.size} per-chunk mastery records from ${chunkSessions.length} chunk sessions.`);
  console.log(`Overall Chunks mastery: ${overallScore}/100 (${overallLevel}) — mastered requires all ${TYPING_CHUNKS.length} chunks mastered.`);
}

async function main() {
  if (!userId) return;
  await recalculateForUser(userId);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
