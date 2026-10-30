import { UserRepository } from '@/lib/aws/repositories/user.repository';
import { MasteryRepository } from '@/lib/aws/repositories/mastery.repository';
import { computeBelt, countChunksMastered } from '@/domains/shared/belt-requirements';
import type { MasteryLevel } from '@/types/platform';

export async function getQuestAccess(studentId: string) {
  const [profile, masteries] = await Promise.all([
    UserRepository.getProfile(studentId),
    MasteryRepository.getAllMastery(studentId),
  ]);
  const levels = Object.fromEntries(
    masteries.map((item) => [item.skill_id, item.mastery_level as MasteryLevel]),
  );
  return {
    profile,
    belt: computeBelt(
      profile?.platform_level ?? 1,
      profile?.belt_exam_passed ?? 0,
      levels,
      countChunksMastered(masteries),
    ),
  };
}
