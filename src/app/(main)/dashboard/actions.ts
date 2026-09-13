'use server';

import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/aws/auth-utils';
import { RecommendationRepository } from '@/lib/aws/repositories/recommendation.repository';

const SKILL_NAMES: Record<string, string> = {
  '00000000-0000-0000-0000-000000000001': 'Home Row',
  '00000000-0000-0000-0000-000000000002': 'Top Row',
  '00000000-0000-0000-0000-000000000003': 'Bottom Row',
  '00000000-0000-0000-0000-000000000004': 'Numbers & Symbols',
  '00000000-0000-0000-0000-000000000005': 'Shift Key Mastery',
  '00000000-0000-0000-0000-000000000006': 'Coding Syntax',
  '00000000-0000-0000-0000-000000000007': '10-Key Numpad',
  '00000000-0000-0000-0000-000000000008': 'Advanced Punctuation',
};

/**
 * Server Action: creates a direct skill recommendation for the user and
 * redirects them to the practice page to start that drill immediately.
 */
export async function trainSkill(skillId: string): Promise<void> {
  const user = await getUserSession();
  if (!user) redirect('/login');

  const skillName = SKILL_NAMES[skillId] || 'Targeted practice';

  await RecommendationRepository.createRecommendation(user.id, {
    recommended_skill_id: skillId,
    recommended_exercise_id: skillId,
    reason: `You selected this track manually: ${skillName}.`,
    priority: 10,
    skills: { name: skillName },
  });

  redirect('/practice');
}
