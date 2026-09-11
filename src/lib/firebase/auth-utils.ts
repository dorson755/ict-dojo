import { cookies } from 'next/headers';
import { adminAuth } from './admin';

export interface UserSession {
  id: string;
  email?: string;
}

export async function getUserSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;

  if (!sessionCookie) return null;

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    return {
      id: decodedClaims.uid,
      email: decodedClaims.email,
    };
  } catch (error) {
    return null;
  }
}

export async function createSessionCookie(idToken: string) {
  // Set session expiration to 5 days.
  const expiresIn = 60 * 60 * 24 * 5 * 1000;
  
  const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
  
  const cookieStore = await cookies();
  cookieStore.set('session', sessionCookie, {
    maxAge: expiresIn,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}
