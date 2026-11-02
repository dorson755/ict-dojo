import { GetCommand, PutCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient, TABLE_NAME } from '../dynamodb';
import { GamificationService } from '@/domains/shared/gamification-service';
import { MasteryService } from '@/domains/shared/mastery-service';
import { applyTrailReward, pokemonForm } from '@/domains/typing/pokemon';
import type {
  PokemonCollection,
  PokemonEncounter,
  PokemonFamily,
  PokemonSpecies,
  TrailBattle,
} from '@/domains/typing/pokemon';
import type { TypingSessionResult } from '@/domains/typing/types';
import type { TypingDNA, StudentProfile } from './user.repository';
import type { SkillMastery } from './mastery.repository';
import type { DailyQuest, PersonalRecord, WeeklyQuest } from './progress.repository';

export interface TrailReceipt {
  id: string;
  xp: number;
  accuracy: number;
  wpm: number;
  won: boolean;
  caught?: PokemonFamily;
  evolved?: PokemonSpecies;
  guardian: boolean;
}
const GAME_KEY = 'POKEMON#COLLECTION';
const SKILL = 'typing-common-words';
function key(userId: string, SK: string) {
  return { PK: `USER#${userId}`, SK };
}
async function read<T>(userId: string, sk: string): Promise<T | null> {
  const result = await dynamoClient.send(
    new GetCommand({ TableName: TABLE_NAME, Key: key(userId, sk), ConsistentRead: true }),
  );
  return (result.Item as T | undefined) ?? null;
}
function snapshotCondition(fields: Record<string, unknown>) {
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};
  const clauses = Object.entries(fields).map(([field, value], i) => {
    names[`#f${i}`] = field;
    if (value === undefined) return `attribute_not_exists(#f${i})`;
    values[`:f${i}`] = value;
    return `#f${i} = :f${i}`;
  });
  return {
    ConditionExpression: clauses.join(' AND '),
    ExpressionAttributeNames: names,
    ...(Object.keys(values).length ? { ExpressionAttributeValues: values } : {}),
  };
}

export class PokemonRepository {
  static get(userId: string) {
    return read<PokemonCollection>(userId, GAME_KEY);
  }
  static async chooseStarter(userId: string, family: PokemonFamily): Promise<PokemonCollection> {
    const collection: PokemonCollection = {
      version: 1,
      partner: family,
      caught: { [family]: 0 },
      wins: 0,
      guardian: false,
      rewardDay: '',
      rewardsToday: 0,
    };
    try {
      await dynamoClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: { ...key(userId, GAME_KEY), ...collection },
          ConditionExpression: 'attribute_not_exists(PK)',
        }),
      );
      return collection;
    } catch (error) {
      if ((error as Error).name !== 'ConditionalCheckFailedException') throw error;
      const existing = await this.get(userId);
      if (!existing) throw error;
      return existing;
    }
  }
  static async replace(
    userId: string,
    previous: PokemonCollection,
    next: PokemonCollection,
  ): Promise<PokemonCollection> {
    const updated = { ...next, version: previous.version + 1 };
    await dynamoClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: { ...key(userId, GAME_KEY), ...updated },
        ConditionExpression: '#version = :version',
        ExpressionAttributeNames: { '#version': 'version' },
        ExpressionAttributeValues: { ':version': previous.version },
      }),
    );
    return updated;
  }
  static async receipt(
    userId: string,
    encounter: Pick<PokemonEncounter, 'id' | 'createdAt'>,
  ): Promise<TrailReceipt | null> {
    const stored = await read<{ trailReceipt: TrailReceipt }>(
      userId,
      `SESSION#${encounter.createdAt}#pokemon#${encounter.id}`,
    );
    return stored?.trailReceipt ?? null;
  }
  static async finish(
    userId: string,
    collection: PokemonCollection,
    encounter: PokemonEncounter,
    battle: TrailBattle,
    result: TypingSessionResult,
  ) {
    // All rewards and the consumed encounter commit together, or not at all.
    // A lost response can safely be retried using the same encounter ID.
    for (let attempt = 0; attempt < 3; attempt++) {
      const already = await this.receipt(userId, encounter);
      if (already) return { collection: (await this.get(userId))!, receipt: already };
      const current = await this.get(userId);
      if (!current || current.active?.id !== encounter.id || current.version !== collection.version)
        throw new Error('This encounter changed in another tab. Return to camp and reload.');
      const now = new Date().toISOString();
      const today = now.slice(0, 10);
      const monday = new Date(now);
      monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() || 7) + 1);
      const week = monday.toISOString().slice(0, 10);
      const [profile, dna, mastery, bestWpm, bestAccuracy, daily, weekly] = await Promise.all([
        read<StudentProfile>(userId, 'PROFILE'),
        read<TypingDNA>(userId, 'DNA#TYPING'),
        read<SkillMastery>(userId, `MASTERY#${SKILL}`),
        read<PersonalRecord>(userId, 'RECORD#best_wpm'),
        read<PersonalRecord>(userId, 'RECORD#best_accuracy'),
        read<DailyQuest>(userId, `QUEST#daily-accuracy#${today}`),
        read<WeeklyQuest>(userId, `QUEST#weekly-consistency#${week}`),
      ]);
      if (!profile) throw new Error('Your learner profile could not be loaded.');
      const repeats = collection.rewardDay === today ? collection.rewardsToday : 0;
      const gamification = new GamificationService();
      const award = gamification.calculateSessionXp(
        result,
        Math.min(5, 1 + Math.floor(encounter.belt / 2)),
        { repeatsToday: repeats },
      );
      const level = gamification.calculateLevelUpdate(
        profile.xp_total ?? 0,
        profile.platform_level ?? 1,
        award.xpGained,
      );
      const streak = gamification.calculateStreakUpdate(
        profile.last_practice_date ?? null,
        profile.streak_count ?? 0,
      );
      const next = {
        ...applyTrailReward(collection, encounter, battle),
        rewardDay: today,
        rewardsToday: repeats + 1,
      };
      const beforeForm = pokemonForm(
        collection.partner,
        collection.caught[collection.partner] ?? 0,
      );
      const afterForm = pokemonForm(next.partner, next.caught[next.partner] ?? 0);
      const receipt: TrailReceipt = {
        id: encounter.id,
        xp: award.xpGained,
        accuracy: result.accuracy,
        wpm: result.wpm,
        won: battle.opponentHp === 0,
        guardian: encounter.guardian,
        ...(battle.phase === 'caught' ? { caught: encounter.opponent } : {}),
        ...(beforeForm !== afterForm ? { evolved: afterForm } : {}),
      };
      const weak = Object.fromEntries(
        Object.entries(dna?.weak_keys ?? {}).map(([char, count]) => [char, count * 0.8]),
      );
      const errors: Record<string, number> = {};
      const totals: Record<string, number> = {};
      for (const stroke of result.keystrokes) {
        totals[stroke.expected] = (totals[stroke.expected] ?? 0) + 1;
        if (!stroke.correct) errors[stroke.expected] = (errors[stroke.expected] ?? 0) + 1;
      }
      for (const [char, count] of Object.entries(errors)) {
        if (totals[char] >= 2 && count / totals[char] >= 0.2)
          weak[char] = (weak[char] ?? 0) + count;
      }
      const sessions = dna?.sessions_analyzed ?? 0;
      const masteryService = new MasteryService();
      const score = masteryService.calculateNewMasteryScore(
        mastery?.mastery_score ?? 0,
        result.accuracy * 0.7 + Math.min(result.wpm / 40, 1) * 30,
        mastery?.practice_count ?? 0,
      );
      const put = (sk: string, data: object) => ({
        TableName: TABLE_NAME,
        Item: { ...key(userId, sk), ...data },
      });
      const dailyProgress = Math.min(2, (daily?.progress ?? 0) + (result.accuracy >= 95 ? 1 : 0));
      const weeklyProgress = Math.min(5, (weekly?.progress ?? 0) + 1);
      const recordWrites = (
        [
          ['best_wpm', result.wpm, bestWpm],
          ['best_accuracy', result.accuracy, bestAccuracy],
        ] as const
      ).flatMap(([metric, value, previous]) =>
        value > (previous?.value ?? 0)
          ? [
              {
                Put: {
                  ...put(`RECORD#${metric}`, { metric, value, achieved_at: now }),
                  ...snapshotCondition({ value: previous?.value }),
                },
              },
            ]
          : [],
      );
      try {
        await dynamoClient.send(
          new TransactWriteCommand({
            TransactItems: [
              {
                Put: {
                  ...put(GAME_KEY, next),
                  ...snapshotCondition({ version: collection.version }),
                },
              },
              {
                Put: {
                  ...put(`SESSION#${encounter.createdAt}#pokemon#${encounter.id}`, {
                    ...result,
                    exercise_id: 'game-pokemon-trails',
                    skill_ids: [SKILL],
                    score: result.compositeScore,
                    created_at: now,
                    trailReceipt: receipt,
                  }),
                  ConditionExpression: 'attribute_not_exists(PK)',
                },
              },
              {
                Update: {
                  TableName: TABLE_NAME,
                  Key: key(userId, 'PROFILE'),
                  UpdateExpression:
                    'SET xp_total = :xp, platform_level = :level, streak_count = :streak, last_practice_date = :day',
                  ...snapshotCondition({
                    xp_total: profile.xp_total,
                    streak_count: profile.streak_count,
                    last_practice_date: profile.last_practice_date,
                  }),
                  ExpressionAttributeValues: {
                    ...snapshotCondition({
                      xp_total: profile.xp_total,
                      streak_count: profile.streak_count,
                      last_practice_date: profile.last_practice_date,
                    }).ExpressionAttributeValues,
                    ':xp': level.newTotalXp,
                    ':level': level.newLevel,
                    ':streak': streak.streak,
                    ':day': today,
                  },
                },
              },
              {
                Put: {
                  ...put('DNA#TYPING', {
                    ...dna,
                    student_id: userId,
                    weak_keys: Object.fromEntries(
                      Object.entries(weak)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 10),
                    ),
                    sessions_analyzed: sessions + 1,
                    avg_wpm: ((dna?.avg_wpm ?? 0) * sessions + result.wpm) / (sessions + 1),
                    avg_accuracy:
                      ((dna?.avg_accuracy ?? 0) * sessions + result.accuracy) / (sessions + 1),
                    last_assessed_at: now,
                  }),
                  ...snapshotCondition({
                    sessions_analyzed: dna?.sessions_analyzed,
                    last_assessed_at: dna?.last_assessed_at,
                  }),
                },
              },
              {
                Put: {
                  ...put(`MASTERY#${SKILL}`, {
                    ...mastery,
                    student_id: userId,
                    skill_id: SKILL,
                    mastery_score: score,
                    mastery_level: masteryService.capLevelBySpeed(
                      masteryService.getMasteryLevelFromScore(score),
                      result.wpm,
                    ),
                    practice_count: (mastery?.practice_count ?? 0) + 1,
                    last_practiced_at: now,
                    updated_at: now,
                    skills: { name: 'Common words' },
                  }),
                  ...snapshotCondition({
                    practice_count: mastery?.practice_count,
                    last_practiced_at: mastery?.last_practiced_at,
                  }),
                },
              },
              {
                Put: put(`MASTERY_HISTORY#${now}#${encounter.id}`, {
                  skill_id: SKILL,
                  previous_score: mastery?.mastery_score ?? 0,
                  new_score: score,
                  source_type: 'practice',
                  created_at: now,
                }),
              },
              ...recordWrites,
              {
                Put: {
                  ...put(`QUEST#daily-accuracy#${today}`, {
                    id: 'daily-accuracy',
                    title: 'Precision practice',
                    description: 'Finish 2 sessions with at least 95% accuracy.',
                    target: 2,
                    progress: dailyProgress,
                    completed: dailyProgress >= 2,
                    reward_xp: 75,
                    date: today,
                  }),
                  ...snapshotCondition({ progress: daily?.progress }),
                },
              },
              {
                Put: {
                  ...put(`QUEST#weekly-consistency#${week}`, {
                    id: 'weekly-consistency',
                    title: 'Consistent practice',
                    description: 'Complete 5 practice sessions this week.',
                    target: 5,
                    progress: weeklyProgress,
                    completed: weeklyProgress >= 5,
                    reward_xp: 250,
                    date: week,
                    week,
                  }),
                  ...snapshotCondition({ progress: weekly?.progress }),
                },
              },
            ],
          }),
        );
        return { collection: next, receipt };
      } catch (error) {
        if ((error as Error).name !== 'TransactionCanceledException') throw error;
        const saved = await this.receipt(userId, encounter);
        if (saved) return { collection: (await this.get(userId))!, receipt: saved };
        if (attempt === 2)
          throw new Error('Progress changed while saving. Retry this encounter save.');
      }
    }
    throw new Error('Your encounter could not be saved. Retry the save.');
  }
}
