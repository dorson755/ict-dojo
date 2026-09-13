'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { login, loginWithGoogle, confirmSignUp, resendConfirmationCode } from '../actions';
import styles from '../auth.module.css';

function LoginForm() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');

  const [error, setError] = useState<string | null>(errorParam);
  const [isLoading, setIsLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);
    const emailValue = formData.get('email') as string;
    setEmail(emailValue);

    const result = await login(formData);
    if (result?.error) {
      // Detect "user not confirmed" and switch to verification mode
      if (result.error.toLowerCase().includes('not confirmed')) {
        setNeedsVerification(true);
        setInfo(`Check your email for a verification code sent to ${emailValue}.`);
      } else {
        setError(result.error);
      }
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter the verification code.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await confirmSignUp(email, code.trim());
    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
    } else if (result?.success) {
      setNeedsVerification(false);
      setError(null);
      setInfo('Email confirmed. Please log in with your password.');
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    setError(null);
    const result = await resendConfirmationCode(email);
    if (result?.error) {
      setError(result.error);
    } else {
      setInfo('A new code has been sent to your email.');
    }
    setIsLoading(false);
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

  // ── Verification step (triggered when login says "not confirmed") ──
  if (needsVerification) {
    return (
      <>
        <h2 className={styles.authFormTitle}>Verify your email</h2>

        {info && <div className={styles.infoMessage}>{info}</div>}
        {error && <div className={styles.errorMessage}>{error}</div>}

        <form onSubmit={handleVerify}>
          <div className="form-group">
            <label htmlFor="code" className="label">Verification code</label>
            <input
              id="code"
              type="text"
              required
              className="input"
              placeholder="Enter the code from your email"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="one-time-code"
            />
          </div>
          <div className={styles.footerText}>
            <Link href="/reset-password" className={styles.link}>Reset password</Link>
          </div>

          <button type="submit" className={styles.authButton} disabled={isLoading}>
            {isLoading ? 'Verifying...' : 'Verify email'}
          </button>
        </form>

        <button
          onClick={handleResend}
          className={styles.resendBtn}
          disabled={isLoading}
        >
          Resend code
        </button>

        <div className={styles.footerText}>
          <button
            onClick={() => { setNeedsVerification(false); setInfo(null); setError(null); }}
            className={styles.resendBtn}
            style={{ marginTop: 'var(--space-2)' }}
          >
            Back to login
          </button>
        </div>
      </>
    );
  }

  // ── Confirmed, need to re-login ──
  if (info && !needsVerification && info.includes('confirmed')) {
    return (
      <>
        <h2 className={styles.authFormTitle}>Email confirmed</h2>
        <p className={styles.authDesc}>{info}</p>
        <form action={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email" className="label">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="input"
              defaultValue={email}
              placeholder="student@example.com"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password" className="label">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="input"
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className={styles.authButton} disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Log in'}
          </button>
        </form>
      </>
    );
  }

  // ── Default login form ──
  return (
    <>
      <h2 className={styles.authFormTitle}>Log in to your dojo</h2>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <form action={handleSubmit}>
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
          <label htmlFor="password" className="label">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="input"
            placeholder="••••••••"
          />
        </div>

        <button type="submit" className={styles.authButton} disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Log in'}
        </button>
      </form>

      <div className={styles.footerText}>
        <Link href="/reset-password" className={styles.authButton}>Forgot password</Link>
      </div>

      <div className={styles.divider}>or</div>

      <button onClick={handleGoogleLogin} className={styles.googleButton} disabled={isLoading}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      <div className={styles.footerText}>
        Don&apos;t have an account? <Link href="/signup" className={styles.link}>Sign up</Link>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
