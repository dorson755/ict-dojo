import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/aws/auth-utils';
import DocumentCraftClient from './DocumentCraftClient';

export default async function DocumentCraftPage() {
  const user = await getUserSession();
  if (!user) redirect('/login');
  if (user.role !== 'student') redirect(user.role === 'teacher' ? '/teacher' : '/parent');
  return <DocumentCraftClient />;
}
