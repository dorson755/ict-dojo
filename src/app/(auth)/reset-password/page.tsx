'use client';

import { useState } from 'react';
import Link from 'next/link';
import { confirmPasswordReset, requestPasswordReset } from '../actions';
import styles from '../auth.module.css';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const result = await requestPasswordReset(email);
    if (result.error) setError(result.error);
    else {
      setCodeSent(true);
      setInfo('A reset code was sent to your verified email address.');
    }
    setLoading(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const result = await confirmPasswordReset(email, String(form.get('code')), String(form.get('password')));
    if (result.error) setError(result.error);
    else setDone(true);
    setLoading(false);
  }

  if (done) return <><h2 className={styles.authFormTitle}>Password reset</h2><p className={styles.authDesc}>Your password has been updated.</p><Link className={styles.authButton} href="/login">Log in</Link></>;

  return <>
    <h2 className={styles.authFormTitle}>Reset password</h2>
    {info && <div className={styles.infoMessage}>{info}</div>}
    {error && <div className={styles.errorMessage}>{error}</div>}
    {!codeSent ? (
      <form onSubmit={sendCode}>
        <div className="form-group"><label className="label" htmlFor="email">Email</label><input className="input" id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>
        <button className={styles.authButton} disabled={loading}>{loading ? 'Sending...' : 'Send reset code'}</button>
      </form>
    ) : (
      <form onSubmit={submit}>
        <div className="form-group"><label className="label" htmlFor="code">6-digit code</label><input className="input" id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required /></div>
        <div className="form-group"><label className="label" htmlFor="password">New password</label><input className="input" id="password" name="password" type="password" minLength={6} required /></div>
        <button className={styles.authButton} disabled={loading}>{loading ? 'Resetting...' : 'Set new password'}</button>
      </form>
    )}
  </>;
}
