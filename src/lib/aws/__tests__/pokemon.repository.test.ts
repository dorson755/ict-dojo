jest.mock('../dynamodb', () => ({ TABLE_NAME: 'test-table', dynamoClient: { send: jest.fn() } }));
import { GetCommand, PutCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient } from '../dynamodb';
import { PokemonRepository } from '../repositories/pokemon.repository';
import { applyTrailInput, createTrailBattle, trailFinished } from '@/domains/typing/pokemon';
import type { PokemonCollection, PokemonEncounter } from '@/domains/typing/pokemon';
import { fallbackQuestContent, QUEST_STAGES } from '@/domains/typing/quest';
import { TypingEvaluator } from '@/domains/typing/evaluator';

const send = dynamoClient.send as jest.Mock;
const encounter: PokemonEncounter = {
  id: 'encounter-id',
  opponent: 'caterpie',
  tutorial: true,
  guardian: false,
  belt: 0,
  words: fallbackQuestContent(QUEST_STAGES[0], {}).words,
  createdAt: new Date().toISOString(),
};
const collection: PokemonCollection = {
  version: 3,
  partner: 'bulbasaur',
  caught: { bulbasaur: 3 },
  wins: 2,
  guardian: false,
  rewardsToday: 0,
  rewardDay: '',
  active: encounter,
};
let battle = createTrailBattle(encounter);
let at = 0;
while (!trailFinished(battle)) {
  for (const key of battle.prompt)
    battle = applyTrailInput(battle, encounter, { kind: 'key', key, at: (at += 200) });
}
const result = new TypingEvaluator().evaluate({
  studentId: 'student',
  exerciseId: 'game-pokemon-trails',
  passage: battle.passage,
  keystrokes: battle.keystrokes,
  startedAt: 0,
  completedAt: at,
  skillIds: ['typing-common-words'],
});

function mockDatabase(
  options: { conflict?: boolean; lostResponse?: boolean; existingReceipt?: boolean } = {},
) {
  let committed = !!options.existingReceipt;
  let conflicted = false;
  const receipt = { id: encounter.id, xp: 100, wpm: 20, accuracy: 100, won: true, guardian: false };
  send.mockImplementation(async (command) => {
    if (command instanceof GetCommand) {
      const sk = command.input.Key!.SK as string;
      if (sk.startsWith('SESSION#'))
        return { Item: committed ? { trailReceipt: receipt } : undefined };
      if (sk === 'POKEMON#COLLECTION') return { Item: collection };
      if (sk === 'PROFILE')
        return {
          Item: {
            xp_total: 200,
            platform_level: 1,
            streak_count: 1,
            last_practice_date: new Date().toISOString().slice(0, 10),
          },
        };
      if (sk === 'DNA#TYPING')
        return {
          Item: { sessions_analyzed: 1, avg_wpm: 20, avg_accuracy: 95, weak_keys: { i: 3 } },
        };
      return {};
    }
    if (command instanceof TransactWriteCommand) {
      if (options.conflict && !conflicted) {
        conflicted = true;
        throw Object.assign(new Error('conflict'), { name: 'TransactionCanceledException' });
      }
      committed = true;
      if (options.lostResponse) throw new Error('Lost connection after commit');
      return {};
    }
    return {};
  });
}
beforeEach(() => {
  jest.resetAllMocks();
  mockDatabase();
});
it('creates exactly one starter with a conditional put', async () => {
  await PokemonRepository.chooseStarter('student', 'bulbasaur');
  const command = send.mock.calls[0][0] as PutCommand;
  expect(command.input.ConditionExpression).toBe('attribute_not_exists(PK)');
  expect(command.input.Item).toMatchObject({ PK: 'USER#student', caught: { bulbasaur: 0 } });
});
it('returns the saved starter if two choices race', async () => {
  send.mockImplementation(async (command) => {
    if (command instanceof PutCommand)
      throw Object.assign(new Error('exists'), { name: 'ConditionalCheckFailedException' });
    return { Item: collection };
  });
  expect((await PokemonRepository.chooseStarter('student', 'charmander')).partner).toBe(
    'bulbasaur',
  );
});
it('uses consistent reads and version checks for collection mutations', async () => {
  await PokemonRepository.get('student');
  expect((send.mock.calls[0][0] as GetCommand).input.ConsistentRead).toBe(true);
  await PokemonRepository.replace('student', collection, collection);
  const command = send.mock.calls[1][0] as PutCommand;
  expect(command.input.Item?.version).toBe(4);
  expect(command.input.ExpressionAttributeValues).toEqual({ ':version': 3 });
});
it('atomically consumes the encounter, evolves the partner, records practice, and updates rewards', async () => {
  const saved = await PokemonRepository.finish('student', collection, encounter, battle, result);
  const commands = send.mock.calls
    .map(([command]) => command)
    .filter((command) => command instanceof TransactWriteCommand);
  expect(commands).toHaveLength(1);
  const writes = (commands[0] as TransactWriteCommand).input.TransactItems!;
  expect(writes).toHaveLength(10);
  const game = writes.find((write) => write.Put?.Item?.SK === 'POKEMON#COLLECTION')!.Put!;
  expect(game.Item).toMatchObject({
    caught: { bulbasaur: 4, caterpie: 0 },
    active: undefined,
    version: 4,
  });
  expect(saved.receipt.evolved).toBe('ivysaur');
  expect(
    writes.find((write) => write.Update?.Key?.SK === 'PROFILE')!.Update!.UpdateExpression,
  ).toContain('xp_total');
  expect(writes.find((write) => write.Put?.Item?.SK === 'DNA#TYPING')!.Put!.Item).toMatchObject({
    sessions_analyzed: 2,
  });
  expect(writes.some((write) => write.Put?.Item?.SK === 'MASTERY#typing-common-words')).toBe(true);
  expect(
    writes.every(
      (write) =>
        write.Put?.ConditionExpression ||
        write.Update?.ConditionExpression ||
        write.Put?.Item?.source_type === 'practice',
    ),
  ).toBe(true);
});
it('does not reaward an encounter with a saved receipt', async () => {
  mockDatabase({ existingReceipt: true });
  await PokemonRepository.finish('student', collection, encounter, battle, result);
  expect(send.mock.calls.some(([command]) => command instanceof TransactWriteCommand)).toBe(false);
});
it('retries a transaction conflict without applying partial rewards', async () => {
  mockDatabase({ conflict: true });
  await PokemonRepository.finish('student', collection, encounter, battle, result);
  expect(
    send.mock.calls.filter(([command]) => command instanceof TransactWriteCommand),
  ).toHaveLength(2);
});
it('recovers a lost response on retry without another reward transaction', async () => {
  mockDatabase({ lostResponse: true });
  await expect(
    PokemonRepository.finish('student', collection, encounter, battle, result),
  ).rejects.toThrow('Lost connection');
  await PokemonRepository.finish('student', collection, encounter, battle, result);
  expect(
    send.mock.calls.filter(([command]) => command instanceof TransactWriteCommand),
  ).toHaveLength(1);
});
it('does not overwrite a collection changed by another encounter', async () => {
  const changed = { ...collection, version: collection.version + 1 };
  await expect(
    PokemonRepository.finish('student', changed, encounter, battle, result),
  ).rejects.toThrow('another tab');
  expect(send.mock.calls.some(([command]) => command instanceof TransactWriteCommand)).toBe(false);
});
