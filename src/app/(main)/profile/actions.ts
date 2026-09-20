'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getUserSession } from '@/lib/aws/auth-utils';
import {
  updateCurrentCognitoProfile,
  verifyCurrentUserEmail,
} from '@/lib/aws/cognito-profile';
import { UserRepository } from '@/lib/aws/repositories/user.repository';

export async function updateStudentProfile(formData: FormData) {
  const user = await getUserSession();
  if (!user || user.role !== 'student') return { error: 'Not authenticated' };

  const displayName = String(formData.get('displayName') || '').trim();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const gradeLevel = Number(formData.get('gradeLevel'));
  if (!displayName || displayName.length > 50) return { error: 'Enter a name between 1 and 50 characters.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { error: 'Enter a valid email address.' };
  if (!Number.isInteger(gradeLevel) || gradeLevel < 1 || gradeLevel > 12) return { error: 'Choose a valid grade level.' };

  try {
    const accessToken = (await cookies()).get('accessToken')?.value;
    if (!accessToken) return { error: 'Your session has expired. Sign in again.' };

    const emailChanged = email !== String(user.email || '').toLowerCase();
    const cognitoResult = await updateCurrentCognitoProfile(accessToken, {
      name: displayName,
      ...(emailChanged ? { email } : {}),
    });
    await UserRepository.updateProfile(user.id, gradeLevel, displayName);
    if (!emailChanged || !cognitoResult.needsEmailVerification) {
      await UserRepository.updateEmail(user.id, email);
    }
    revalidatePath('/profile');
    revalidatePath('/teacher');

    return {
      success: true,
      needsEmailVerification: emailChanged && cognitoResult.needsEmailVerification,
    };
  } catch (error: unknown) {
    console.error('Profile update error:', error);
    return { error: 'Could not save profile changes.' };
  }
}

export async function confirmStudentEmail(code: string) {
  const user = await getUserSession();
  if (!user || user.role !== 'student') return { error: 'Not authenticated' };
  if (!/^\d{4,8}$/.test(code.trim())) return { error: 'Enter the verification code from your email.' };

  try {
    const accessToken = (await cookies()).get('accessToken')?.value;
    if (!accessToken) return { error: 'Your session has expired. Sign in again.' };

    const email = await verifyCurrentUserEmail(accessToken, code.trim());
    if (email) await UserRepository.updateEmail(user.id, email);
    revalidatePath('/profile');
    revalidatePath('/teacher');
    return { success: true };
  } catch (error: unknown) {
    console.error('Email confirmation error:', error);
    return { error: 'That verification code was not accepted.' };
  }
}
