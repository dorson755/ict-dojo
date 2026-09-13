'use server';

import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/aws/auth-utils';
import { RecommendationRepository } from '@/lib/aws/repositories/recommendation.repository';
import { SkillRepository } from '@/lib/aws/repositories/skill.repository';

/**
 * Server Action: creates a direct skill recommendation for the user and
 * redirects them to the practice page to start that drill immediately.
 */
export async function trainSkill(skillId: string): Promise<void> {
  const user = await getUserSession();
  if (!user) redirect('/login');

  const skill = await SkillRepository.getSkill('1', skillId);
  const skillName = skill?.name || 'Targeted practice';

  await RecommendationRepository.createRecommendation(user.id, {
    recommended_skill_id: skillId,
    recommended_exercise_id: skillId,
    reason: `You selected this track manually: ${skillName}.`,
    priority: 100,
    skills: { name: skillName },
  });

  redirect('/practice');
}
