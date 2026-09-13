'use server';

import { getUserSession } from '@/lib/aws/auth-utils';
import { UserRepository } from '@/lib/aws/repositories/user.repository';

export async function submitOnboarding(formData: FormData) {
  const user = await getUserSession();
  
  if (!user) {
    return { error: 'Not authenticated' };
  }

  const rawGradeLevel = formData.get('gradeLevel') as string;
  const gradeLevel = parseInt(rawGradeLevel, 10);

  if (isNaN(gradeLevel) || gradeLevel < 1 || gradeLevel > 12) {
    return { error: 'Invalid grade level' };
  }

  try {
    await UserRepository.updateProfile(user.id, gradeLevel, user.name);
    
    // We can also initialize some default typing domains here using DynamoDB if we wanted
    // For now we assume diagnostic initializes the DNA
    
    return { success: true };
  } catch (error: unknown) {
    console.error('Onboarding update error:', error);
    return { error: `Failed to save profile information: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}
