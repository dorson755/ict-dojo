'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/firebase/config';
import { adminAuth } from '@/lib/firebase/admin';
import { createSessionCookie, clearSessionCookie } from '@/lib/firebase/auth-utils';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  let idToken: string | null = null;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    idToken = await userCredential.user.getIdToken();
  } catch (error: any) {
    console.error('Login error:', error);
    return { error: error.message || 'Failed to login' };
  }

  if (idToken) {
    await createSessionCookie(idToken);
    revalidatePath('/', 'layout');
    redirect('/dashboard');
  }

  return { error: 'Authentication failed' };
}

export async function signup(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const displayName = formData.get('displayName') as string;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Set display name on Firebase Admin
    await adminAuth.updateUser(userCredential.user.uid, {
      displayName: displayName,
    });

    // Send verification email
    await sendEmailVerification(userCredential.user);

    return { needsVerification: true, email };
  } catch (error: any) {
    console.error('Signup error:', error);
    return { error: error.message || 'Failed to sign up' };
  }
}

export async function confirmSignUp(email: string, code: string) {
  // In Firebase, email verification usually happens via a link sent to email.
  // The user clicks the link to verify. Since we used confirmation code previously,
  // we might need to tell the user to click the link instead.
  // For the sake of the existing UI flow, we'll pretend it's verified, or throw an error.
  return { error: 'Please click the verification link sent to your email.' };
}

export async function resendConfirmationCode(email: string) {
  // Not natively supported by just email in Firebase client SDK (need the user object).
  return { error: 'Please check your spam folder or sign up again.' };
}

export async function loginWithGoogle() {
  // Handled client-side in Firebase normally. Server action redirecting to hosted UI isn't used.
  return { error: 'Google login is currently disabled on the backend.' };
}

export async function logout() {
  await clearSessionCookie();
  redirect('/login');
}
