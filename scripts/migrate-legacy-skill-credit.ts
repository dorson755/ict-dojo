/**
 * Moves practice credit recorded under the retired Home Row skill id
 * (00000000-0000-0000-0000-000000000001) onto the current `typing-home-row`
 * skill, so learners keep the work they genuinely did.
 *
 * Dry run by default. Set APPLY=1 to write. A JSON backup of every record that
 * will be changed or removed is always written to scripts/backups/ first.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/migrate-legacy-skill-credit.ts
 *   APPLY=1 npx ts-node --compiler-options '{"module":"commonjs"}' scripts/migrate-legacy-skill-credit.ts
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { MasteryService } from '../src/domains/shared/mastery-service';
import { TYPING_SKILL_IDS } from '../src/domains/typing/catalog';
import type { SkillMastery } from '../src/types/platform';

const LEGACY_SKILL_ID = '00000000-0000-0000-0000-000000000001';
const TARGET_SKILL_ID = TYPING_SKILL_IDS.homeRow;

const region = process.env.APP_REGION || process.env.AWS_REGION || 'us-east-2';
const tableName = process.env.DYNAMODB_TABLE_NAME || 'ict-dojo-main';
const apply = process.env.APPLY === '1';
const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
const masteryService = new MasteryService();

type Item = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

async function scanAll(filter: string, values: Record<string, unknown>): Promise<Item[]> {
  const out: Item[] = [];
  let key: Record<string, unknown> | undefined;
  do {
    const response = await doc.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: filter,
        ExpressionAttributeValues: values,
        ExclusiveStartKey: key,
      }),
    );
    out.push(...((response.Items ?? []) as Item[]));
    key = response.LastEvaluatedKey;
  } while (key);
  return out;
}

async function queryPrefix(pk: string, prefix: string): Promise<Item[]> {
  const response = await doc.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': pk, ':sk': prefix },
    }),
  );
  return (response.Items ?? []) as Item[];
}

function sessionScore(session: Item): number {
  return Number(session.accuracy || 0) * 0.7 + Math.min(Number(session.wpm || 0) / 40, 1) * 30;
}

/** Replays sessions through the live mastery model, oldest first. */
function replay(userId: string, sessions: Item[]) {
  let score = 0;
  let level = 'not_started';
  let count = 0;
  for (const session of sessions) {
    const snapshot: SkillMastery | undefined = count
      ? {
          id: TARGET_SKILL_ID,
          student_id: userId,
          skill_id: TARGET_SKILL_ID,
          mastery_score: score,
          mastery_level: level as SkillMastery['mastery_level'],
          practice_count: count,
          last_practiced_at: null,
          updated_at: '',
        }
      : undefined;
    const next = masteryService.processAttempt(snapshot, userId, TARGET_SKILL_ID, sessionScore(session));
    score = next.newScore;
    level = next.newLevel;
    count += 1;
  }
  return { score, level, count };
}

async function main() {
  const legacyRows = await scanAll('SK = :sk', { ':sk': `MASTERY#${LEGACY_SKILL_ID}` });
  console.log(`${apply ? 'APPLY' : 'DRY RUN'}: ${legacyRows.length} learner(s) have credit under the retired id.\n`);

  const profiles = await scanAll('SK = :sk', { ':sk': 'PROFILE' });
  const nameByPk = new Map(profiles.map((profile) => [String(profile.PK), String(profile.display_name ?? profile.PK)]));

  const backup: Record<string, Item[]> = { mastery: [], history: [], sessions: [] };
  type Outcome = { score: number; level: string; count: number; method: 'replay' | 'relabel' | 'merge-keep-existing'; note: string };
  const plan: Array<{ pk: string; userId: string; legacy: Item; existing?: Item; sessions: Item[]; outcome: Outcome; lastAt: string }> = [];

  for (const legacy of legacyRows) {
    const pk = String(legacy.PK);
    const userId = pk.replace('USER#', '');
    const allSessions = await queryPrefix(pk, 'SESSION#');
    const sessions = allSessions
      .filter((session) => Array.isArray(session.skill_ids) && (session.skill_ids.includes(LEGACY_SKILL_ID) || session.skill_ids.includes(TARGET_SKILL_ID)))
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    const existing = (await queryPrefix(pk, `MASTERY#${TARGET_SKILL_ID}`)).find((row) => row.SK === `MASTERY#${TARGET_SKILL_ID}`);
    const legacySessions = sessions.filter((session) => session.skill_ids.includes(LEGACY_SKILL_ID));
    const legacyCount = Number(legacy.practice_count || 0);
    const lastAt = String(sessions[sessions.length - 1]?.created_at ?? legacy.last_practiced_at ?? new Date().toISOString());

    let outcome: Outcome;
    if (legacySessions.length >= legacyCount && legacyCount > 0) {
      const replayed = replay(userId, sessions);
      // Never lower a score the learner already holds on the current skill.
      if (existing && replayed.score < Number(existing.mastery_score)) {
        outcome = {
          score: Number(existing.mastery_score),
          level: String(existing.mastery_level),
          count: Number(existing.practice_count) + legacyCount,
          method: 'merge-keep-existing',
          note: 'replay would lower the current score, so it is kept and attempts are added',
        };
      } else {
        outcome = { ...replayed, method: 'replay', note: `rebuilt from ${sessions.length} session(s)` };
      }
    } else {
      // The sessions behind this credit were never tagged, so they cannot be replayed.
      // Keep the value the app recorded at the time instead of discarding it.
      const keepExisting = existing && Number(existing.mastery_score) >= Number(legacy.mastery_score);
      outcome = keepExisting
        ? {
            score: Number(existing!.mastery_score),
            level: String(existing!.mastery_level),
            count: Number(existing!.practice_count) + legacyCount,
            method: 'merge-keep-existing',
            note: 'untagged sessions; kept higher existing score, added attempts',
          }
        : {
            score: Number(legacy.mastery_score),
            level: String(legacy.mastery_level),
            count: Number(existing?.practice_count || 0) + legacyCount,
            method: 'relabel',
            note: 'untagged sessions; stored value kept as recorded',
          };
    }
    plan.push({ pk, userId, legacy, existing, sessions, outcome, lastAt });

    backup.mastery.push(legacy, ...(existing ? [existing] : []));
    backup.sessions.push(...sessions.filter((session) => session.skill_ids.includes(LEGACY_SKILL_ID)));
  }

  const histories = await scanAll('begins_with(SK, :sk)', { ':sk': 'MASTERY_HISTORY#' });
  backup.history = histories.filter((row) => row.skill_id === LEGACY_SKILL_ID);

  console.log('learner'.padEnd(15), 'legacy'.padEnd(11), 'current'.padEnd(11), 'result'.padEnd(22), 'method');
  for (const entry of plan) {
    const legacyText = `${Number(entry.legacy.mastery_score).toFixed(1)} n${entry.legacy.practice_count}`;
    const existingText = entry.existing ? `${Number(entry.existing.mastery_score).toFixed(1)} n${entry.existing.practice_count}` : 'none';
    const resultText = `${entry.outcome.score.toFixed(1)} ${entry.outcome.level} n${entry.outcome.count}`;
    console.log((nameByPk.get(entry.pk) ?? entry.pk).slice(0, 14).padEnd(15), legacyText.padEnd(11), existingText.padEnd(11), resultText.padEnd(22), `${entry.outcome.method} (${entry.outcome.note})`);
  }

  const dir = join(__dirname, 'backups');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `legacy-skill-credit-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  writeFileSync(file, JSON.stringify(backup, null, 2));
  console.log(`\nBackup written: ${file}`);

  if (!apply) {
    console.log('Dry run only. Re-run with APPLY=1 to write these changes.');
    return;
  }

  for (const entry of plan) {
    await doc.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          PK: entry.pk,
          SK: `MASTERY#${TARGET_SKILL_ID}`,
          student_id: entry.userId,
          skill_id: TARGET_SKILL_ID,
          mastery_score: entry.outcome.score,
          mastery_level: entry.outcome.level,
          practice_count: entry.outcome.count,
          last_practiced_at: entry.lastAt,
          skills: { name: 'Home row' },
          updated_at: new Date().toISOString(),
        },
      }),
    );
    for (const session of entry.sessions.filter((item) => item.skill_ids.includes(LEGACY_SKILL_ID))) {
      await doc.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { PK: session.PK, SK: session.SK },
          UpdateExpression: 'SET skill_ids = :ids',
          ExpressionAttributeValues: {
            ':ids': session.skill_ids.map((id: string) => (id === LEGACY_SKILL_ID ? TARGET_SKILL_ID : id)),
          },
        }),
      );
    }
    await doc.send(new DeleteCommand({ TableName: tableName, Key: { PK: entry.pk, SK: `MASTERY#${LEGACY_SKILL_ID}` } }));
  }

  for (const row of backup.history) {
    await doc.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { PK: row.PK, SK: row.SK },
        UpdateExpression: 'SET skill_id = :id',
        ExpressionAttributeValues: { ':id': TARGET_SKILL_ID },
      }),
    );
  }
  console.log('\nDone. Legacy credit moved to typing-home-row.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
