'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import styles from '../auth.module.css';

async function createSession(idToken: string) {
  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to create session');
  }
}

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const displayName = formData.get('displayName') as string;

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      // Set display name on the Firebase user
      await updateProfile(credential.user, { displayName });
      const idToken = await credential.user.getIdToken();
      await createSession(idToken);
      // New user — send to onboarding
      router.push('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      const idToken = await credential.user.getIdToken();
      await createSession(idToken);
      router.push('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Google sign-up failed');
      setIsLoading(false);
    }
  };

  return (
    <>
      <h2 className={styles.authFormTitle}>Create your account</h2>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="displayName" className="label">Display name</label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            required
            className="input"
            placeholder="e.g. Alex Chen"
          />
        </div>

        <div className="form-group">
          <label htmlFor="email" className="label">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="input"
            placeholder="student@example.com"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password" className="label">Password (min. 6 characters)</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            className="input"
            placeholder="••••••••"
          />
        </div>

        <button type="submit" className={styles.authButton} disabled={isLoading}>
          {isLoading ? 'Creating account...' : 'Sign up'}
        </button>
      </form>

      <div className={styles.divider}>or</div>

      <button onClick={handleGoogleSignup} className={styles.googleButton} disabled={isLoading}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Sign up with Google
      </button>

      <div className={styles.footerText}>
        Already have an account? <Link href="/login" className={styles.link}>Log in</Link>
      </div>
    </>
  );
}
