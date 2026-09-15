import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/aws/auth-utils';
import { MasteryRepository } from '@/lib/aws/repositories/mastery.repository';
import ChunksClient, { type ChunkMasteryInfo } from './ChunksClient';

const CHUNK_MASTERY_PREFIX = 'chunk:';

export default async function ChunksPage() {
  const user = await getUserSession();
  if (!user) redirect('/login');
  if (user.role === 'teacher') redirect('/teacher');
  if (user.role === 'parent') redirect('/parent');

  const masteries = await MasteryRepository.getAllMastery(user.id).catch(() => []);
  const chunkMastery: Record<string, ChunkMasteryInfo> = {};
  for (const mastery of masteries) {
    if (!mastery.skill_id.startsWith(CHUNK_MASTERY_PREFIX)) continue;
    chunkMastery[mastery.skill_id.slice(CHUNK_MASTERY_PREFIX.length)] = {
      score: mastery.mastery_score,
      level: mastery.mastery_level,
      count: mastery.practice_count,
    };
  }

  return <ChunksClient studentId={user.id} chunkMastery={chunkMastery} />;
}
