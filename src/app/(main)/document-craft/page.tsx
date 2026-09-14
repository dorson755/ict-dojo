import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/aws/auth-utils';
import DocumentCraftClient from './DocumentCraftClient';
import { DOCUMENT_PROJECTS } from '@/domains/document-craft/projects';

export default async function DocumentCraftPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const user = await getUserSession();
  if (!user) redirect('/login');
  if (user.role !== 'student') redirect(user.role === 'teacher' ? '/teacher' : '/parent');
  const params = await searchParams;
  if (!params.project || !DOCUMENT_PROJECTS.some((project) => project.id === params.project)) redirect('/document-craft/projects');
  return <DocumentCraftClient projectId={params.project} />;
}
