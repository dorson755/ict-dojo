'use server';

import { getUserSession } from '@/lib/aws/auth-utils';
import { DocumentRepository } from '@/lib/aws/repositories/document.repository';

export async function saveDocumentProject(projectId: string, html: string, passed: boolean, completedChecks: string[]) {
  const user = await getUserSession();
  if (!user || user.role !== 'student') return { error: 'Not authorized' };
  await DocumentRepository.saveAttempt(user.id, {
    project_id: projectId,
    document_html: html.slice(0, 100_000),
    passed,
    completed_checks: completedChecks,
  });
  return { success: true };
}
