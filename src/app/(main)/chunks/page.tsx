import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/aws/auth-utils';
import ChunksClient from './ChunksClient';

export default async function ChunksPage() {
  const user = await getUserSession();
  if (!user) redirect('/login');
  if (user.role === 'teacher') redirect('/teacher');
  if (user.role === 'parent') redirect('/parent');

  return <ChunksClient studentId={user.id} />;
}
