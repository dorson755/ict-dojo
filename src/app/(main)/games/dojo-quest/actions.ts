'use server';

import { getUserSession } from '@/lib/aws/auth-utils';
import { UserRepository } from '@/lib/aws/repositories/user.repository';
import { getQuestAccess } from '@/lib/quest-access';
import { generateQuestContent } from '@/lib/groq/quest-generator';
import { canEnterStage, questStage } from '@/domains/typing/quest';

/** `wordsOnly` is for games that never show the boss scroll (sparring, Dojo Defense). */
export async function prepareQuestStage(belt: number, wordsOnly = false) {
  const user = await getUserSession();
  if (!user || user.role !== 'student') throw new Error('Sign in as a student to play.');
  const stage = questStage(belt);
  if (!stage) throw new Error('Unknown stage.');
  const access = await getQuestAccess(user.id);
  if (!access.profile?.grade_level || !canEnterStage(access.belt, belt)) {
    throw new Error('Earn this belt before entering its stage.');
  }
  const dna = await UserRepository.getTypingDNA(user.id).catch(() => null);
  return generateQuestContent(stage, dna?.weak_keys ?? {}, { scroll: wordsOnly !== true });
}
