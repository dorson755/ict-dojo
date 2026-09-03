'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signup, loginWithGoogle } from '../actions';
import styles from '../auth.module.css';

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);
    const result = await signup(formData);
    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    const result = await loginWithGoogle();
    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
    }
  };

  return (
    <>
      <h2 className={styles.authTitle} style={{ fontSize: '1.25rem', textAlign: 'center' }}>
        Create Your Account
      </h2>
      
      {error && <div className={styles.errorMessage}>{error}</div>}

      <form action={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="displayName" className={styles.label}>Display Name</label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            required
            className={styles.input}
            placeholder="e.g. John Doe"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="email" className={styles.label}>Email Address</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className={styles.input}
            placeholder="student@example.com"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="password" className={styles.label}>Password (min. 6 chars)</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            className={styles.input}
            placeholder="••••••••"
          />
        </div>

        <button type="submit" className={styles.button} disabled={isLoading}>
          {isLoading ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>

      <div className={styles.divider}>or</div>

      <button onClick={handleGoogleLogin} className={styles.googleButton} disabled={isLoading}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Sign up with Google
      </button>

      <div className={styles.footerText}>
        Already have an account? <Link href="/login" className={styles.link}>Log In</Link>
      </div>
    </>
  );
}
