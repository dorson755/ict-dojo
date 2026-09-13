'use server';

import { getUserSession } from '@/lib/aws/auth-utils';
import { UserRepository } from '@/lib/aws/repositories/user.repository';

export async function updateStudentProfile(formData: FormData) {
  const user = await getUserSession();
  if (!user) return { error: 'Not authenticated' };

  const displayName = String(formData.get('displayName') || '').trim();
  const gradeLevel = Number(formData.get('gradeLevel'));
  if (!displayName || displayName.length > 50) return { error: 'Enter a name between 1 and 50 characters.' };
  if (!Number.isInteger(gradeLevel) || gradeLevel < 1 || gradeLevel > 12) return { error: 'Choose a valid grade level.' };

  try {
    await UserRepository.updateProfile(user.id, gradeLevel, displayName);
    return { success: true };
  } catch (error: unknown) {
    console.error('Profile update error:', error);
    return { error: 'Could not save profile changes.' };
  }
}
