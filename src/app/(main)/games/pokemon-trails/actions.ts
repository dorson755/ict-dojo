'use server';

import { randomInt, randomUUID } from 'node:crypto';
import { getUserSession } from '@/lib/aws/auth-utils';
import { getQuestAccess } from '@/lib/quest-access';
import { PokemonRepository } from '@/lib/aws/repositories/pokemon.repository';
import { UserRepository } from '@/lib/aws/repositories/user.repository';
import { generateQuestContent } from '@/lib/groq/quest-generator';
import { QUEST_STAGES } from '@/domains/typing/quest';
import { isPokemonFamily, replayTrail, STARTERS } from '@/domains/typing/pokemon';
import type { PokemonFamily } from '@/domains/typing/pokemon';
import { TypingEvaluator } from '@/domains/typing/evaluator';

async function learner() {
  const user = await getUserSession();
  if (!user || user.role !== 'student') throw new Error('Sign in as a student to explore.');
  const access = await getQuestAccess(user.id);
  if (!access.profile?.grade_level)
    throw new Error('Complete onboarding before choosing a partner.');
  return { user, access };
}
export async function chooseTrailStarter(value: unknown) {
  const { user } = await learner();
  if (!isPokemonFamily(value) || !STARTERS.includes(value))
    throw new Error('Choose one of the three starters.');
  return PokemonRepository.chooseStarter(user.id, value);
}
export async function changeTrailPartner(value: unknown) {
  const { user } = await learner();
  const collection = await PokemonRepository.get(user.id);
  if (!collection || !isPokemonFamily(value) || collection.caught[value] === undefined)
    throw new Error('Choose a Pokémon in your collection.');
  if (collection.active)
    throw new Error('Finish or leave the current encounter before changing partners.');
  return PokemonRepository.replace(user.id, collection, { ...collection, partner: value });
}
export async function prepareTrailEncounter(guardian = false) {
  const { user, access } = await learner();
  if (typeof guardian !== 'boolean') throw new Error('Invalid encounter.');
  const collection = await PokemonRepository.get(user.id);
  if (!collection) throw new Error('Choose your starter first.');
  if (collection.active) {
    if (Date.now() - Date.parse(collection.active.createdAt) < 1800_000) return collection;
    throw new Error('This encounter has expired. Leave it and start a new one.');
  }
  if (guardian && collection.wins < 3)
    throw new Error('Win three encounters before meeting the guardian.');
  const dna = await UserRepository.getTypingDNA(user.id).catch(() => null);
  const content = await generateQuestContent(QUEST_STAGES[access.belt], dna?.weak_keys ?? {}, {
    scroll: false,
  });
  const pool: PokemonFamily[] = collection.guardian
    ? ['pidgey', 'caterpie', ...STARTERS]
    : ['pidgey', 'caterpie'];
  const active = {
    id: randomUUID(),
    opponent: guardian ? ('pidgey' as const) : pool[randomInt(pool.length)],
    guardian,
    tutorial: collection.wins === 0,
    words: content.words,
    createdAt: new Date().toISOString(),
    belt: access.belt,
  };
  return PokemonRepository.replace(user.id, collection, { ...collection, active });
}
export async function leaveTrailEncounter(encounterId: unknown) {
  const { user } = await learner();
  const collection = await PokemonRepository.get(user.id);
  if (!collection) throw new Error('Choose a starter first.');
  if (!collection.active) return collection;
  if (collection.active.id !== encounterId)
    throw new Error('This encounter changed in another tab. Reload the trail.');
  return PokemonRepository.replace(user.id, collection, { ...collection, active: undefined });
}
export async function finishTrailEncounter(encounterId: unknown, inputs: unknown) {
  const { user } = await learner();
  if (typeof encounterId !== 'string' || !/^[a-f0-9-]{36}$/.test(encounterId))
    throw new Error('Invalid encounter ID.');
  const collection = await PokemonRepository.get(user.id);
  if (!collection) throw new Error('Choose a starter first.');
  if (collection.lastEncounter?.id === encounterId) {
    const receipt = await PokemonRepository.receipt(user.id, collection.lastEncounter);
    if (receipt) return { collection, receipt };
  }
  const encounter = collection.active;
  if (!encounter || encounter.id !== encounterId)
    throw new Error('This encounter is no longer active. Reload the trail.');
  const elapsed = Date.now() - Date.parse(encounter.createdAt);
  if (elapsed < 1000 || elapsed >= 1800_000)
    throw new Error('This encounter has expired or is too short to save.');
  const battle = replayTrail(encounter, inputs, elapsed);
  const duration = battle.keystrokes.at(-1)!.timestamp_ms;
  const result = new TypingEvaluator().evaluate({
    studentId: user.id,
    exerciseId: 'game-pokemon-trails',
    passage: battle.passage,
    keystrokes: battle.keystrokes,
    startedAt: 0,
    completedAt: duration,
    skillIds: ['typing-common-words'],
    mode: 'accuracy',
  });
  if (!result.isValid || result.wpm > 220)
    throw new Error('This typing session could not be validated. Return to camp and try again.');
  return PokemonRepository.finish(user.id, collection, encounter, battle, result);
}
