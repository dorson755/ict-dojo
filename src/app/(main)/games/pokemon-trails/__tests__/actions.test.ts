jest.mock('@/lib/aws/auth-utils', () => ({ getUserSession: jest.fn() }));
jest.mock('@/lib/quest-access', () => ({ getQuestAccess: jest.fn() }));
jest.mock('@/lib/aws/repositories/pokemon.repository', () => ({
  PokemonRepository: {
    get: jest.fn(),
    chooseStarter: jest.fn(),
    replace: jest.fn(),
    receipt: jest.fn(),
    finish: jest.fn(),
  },
}));
jest.mock('@/lib/aws/repositories/user.repository', () => ({
  UserRepository: { getTypingDNA: jest.fn() },
}));
jest.mock('@/lib/groq/quest-generator', () => ({ generateQuestContent: jest.fn() }));

import { getUserSession } from '@/lib/aws/auth-utils';
import { getQuestAccess } from '@/lib/quest-access';
import { PokemonRepository } from '@/lib/aws/repositories/pokemon.repository';
import { UserRepository } from '@/lib/aws/repositories/user.repository';
import { generateQuestContent } from '@/lib/groq/quest-generator';
import { fallbackQuestContent, QUEST_STAGES } from '@/domains/typing/quest';
import { applyTrailInput, createTrailBattle, trailFinished } from '@/domains/typing/pokemon';
import type { PokemonCollection, PokemonEncounter, TrailInput } from '@/domains/typing/pokemon';
import {
  changeTrailPartner,
  chooseTrailStarter,
  finishTrailEncounter,
  leaveTrailEncounter,
  prepareTrailEncounter,
} from '../actions';

const repo = PokemonRepository as jest.Mocked<typeof PokemonRepository>;
const collection: PokemonCollection = {
  version: 1,
  partner: 'bulbasaur',
  caught: { bulbasaur: 0 },
  wins: 0,
  guardian: false,
  rewardDay: '',
  rewardsToday: 0,
};
const words = fallbackQuestContent(QUEST_STAGES[0], {});
beforeEach(() => {
  jest.resetAllMocks();
  (getUserSession as jest.Mock).mockResolvedValue({ id: 'student', role: 'student' });
  (getQuestAccess as jest.Mock).mockResolvedValue({ profile: { grade_level: 5 }, belt: 0 });
  (generateQuestContent as jest.Mock).mockResolvedValue(words);
  (UserRepository.getTypingDNA as jest.Mock).mockResolvedValue({ weak_keys: { i: 3 } });
  repo.get.mockResolvedValue(collection);
  repo.replace.mockImplementation(async (_id, _previous, next) => next);
});
it.each([null, { id: 'teacher', role: 'teacher' }, { id: 'parent', role: 'parent' }])(
  'blocks non-students from all mutations %#',
  async (user) => {
    (getUserSession as jest.Mock).mockResolvedValue(user);
    await expect(chooseTrailStarter('bulbasaur')).rejects.toThrow();
    await expect(prepareTrailEncounter()).rejects.toThrow();
    await expect(changeTrailPartner('bulbasaur')).rejects.toThrow();
    await expect(leaveTrailEncounter('id')).rejects.toThrow();
    await expect(finishTrailEncounter('id', [])).rejects.toThrow();
    expect(repo.replace).not.toHaveBeenCalled();
  },
);
it('requires onboarding and only accepts the three starter families', async () => {
  await expect(chooseTrailStarter('__proto__')).rejects.toThrow();
  await expect(chooseTrailStarter('pidgey')).rejects.toThrow();
  (getQuestAccess as jest.Mock).mockResolvedValue({ profile: {}, belt: 0 });
  await expect(chooseTrailStarter('bulbasaur')).rejects.toThrow();
});
it('chooses a starter using the authenticated user, not a supplied student ID', async () => {
  await chooseTrailStarter('charmander');
  expect(repo.chooseStarter).toHaveBeenCalledWith('student', 'charmander');
});
it('creates a server-owned encounter with belt-matched, words-only content', async () => {
  const result = await prepareTrailEncounter();
  expect(generateQuestContent).toHaveBeenCalledWith(QUEST_STAGES[0], { i: 3 }, { scroll: false });
  expect(result.active).toMatchObject({
    tutorial: true,
    guardian: false,
    belt: 0,
    words: words.words,
  });
  expect(['pidgey', 'caterpie']).toContain(result.active?.opponent);
});
it('resumes an active encounter without burning more model tokens', async () => {
  const active = { id: 'existing', createdAt: new Date().toISOString() } as PokemonEncounter;
  repo.get.mockResolvedValue({ ...collection, active });
  expect((await prepareTrailEncounter()).active?.id).toBe('existing');
  expect(generateQuestContent).not.toHaveBeenCalled();
});
it('blocks premature guardians and expired encounters', async () => {
  await expect(prepareTrailEncounter(true)).rejects.toThrow('three');
  repo.get.mockResolvedValue({
    ...collection,
    active: { createdAt: new Date(Date.now() - 1900_000).toISOString() } as PokemonEncounter,
  });
  await expect(prepareTrailEncounter()).rejects.toThrow('expired');
});
it('only permits owned partners and does not change a partner during an encounter', async () => {
  await expect(changeTrailPartner('pidgey')).rejects.toThrow();
  await changeTrailPartner('bulbasaur');
  expect(repo.replace).toHaveBeenCalled();
  repo.get.mockResolvedValue({ ...collection, active: {} as PokemonEncounter });
  await expect(changeTrailPartner('bulbasaur')).rejects.toThrow();
});
it('only leaves the specified active encounter', async () => {
  repo.get.mockResolvedValue({ ...collection, active: { id: 'current' } as PokemonEncounter });
  await expect(leaveTrailEncounter('old')).rejects.toThrow();
  await leaveTrailEncounter('current');
  expect(repo.replace).toHaveBeenCalledWith(
    'student',
    expect.anything(),
    expect.objectContaining({ active: undefined }),
  );
});
it('returns an existing receipt without applying rewards again', async () => {
  const id = '12345678-1234-1234-1234-123456789012';
  repo.get.mockResolvedValue({ ...collection, lastEncounter: { id, createdAt: 'now' } });
  repo.receipt.mockResolvedValue({
    id,
    xp: 100,
    accuracy: 99,
    wpm: 30,
    won: true,
    guardian: false,
  });
  expect((await finishTrailEncounter(id, [])).receipt.xp).toBe(100);
  expect(repo.finish).not.toHaveBeenCalled();
});
it('evaluates a complete replay on the server and rejects forged or unfinished results', async () => {
  const active: PokemonEncounter = {
    id: '12345678-1234-1234-1234-123456789012',
    words: words.words,
    belt: 0,
    opponent: 'caterpie',
    guardian: false,
    tutorial: true,
    createdAt: new Date(Date.now() - 200_000).toISOString(),
  };
  repo.get.mockResolvedValue({ ...collection, active });
  await expect(finishTrailEncounter(active.id, [{ kind: 'caught', at: 10 }])).rejects.toThrow();
  expect(repo.finish).not.toHaveBeenCalled();
  let state = createTrailBattle(active);
  const inputs: TrailInput[] = [];
  let at = 0;
  while (!trailFinished(state)) {
    for (const key of state.prompt) {
      const event: TrailInput = { kind: 'key', key, at: (at += 200) };
      inputs.push(event);
      state = applyTrailInput(state, active, event);
    }
  }
  await finishTrailEncounter(active.id, inputs);
  expect(repo.finish).toHaveBeenCalledWith(
    'student',
    expect.anything(),
    active,
    expect.objectContaining({ phase: 'caught' }),
    expect.objectContaining({ accuracy: 100, isValid: true }),
  );
});
