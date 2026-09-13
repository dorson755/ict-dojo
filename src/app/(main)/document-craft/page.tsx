import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/aws/auth-utils';
import DocumentCraftClient from './DocumentCraftClient';

export default async function DocumentCraftPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const user = await getUserSession();
  if (!user) redirect('/login');
  if (user.role !== 'student') redirect(user.role === 'teacher' ? '/teacher' : '/parent');
  const params = await searchParams;
  return <DocumentCraftClient projectId={params.project} />;
}
