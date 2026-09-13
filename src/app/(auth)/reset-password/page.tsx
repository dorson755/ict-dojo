'use client';

import { useState } from 'react';
import Link from 'next/link';
import { confirmPasswordReset } from '../actions';
import styles from '../auth.module.css';

export default function ResetPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await confirmPasswordReset(
      String(formData.get('email')),
      String(formData.get('code')),
      String(formData.get('password')),
    );
    if (result.error) setError(result.error);
    else setDone(true);
    setLoading(false);
  }

  if (done) return <><h2 className={styles.authFormTitle}>Password reset</h2><p className={styles.authDesc}>Your password has been updated.</p><Link className={styles.authButton} href="/login">Log in</Link></>;
  return <><h2 className={styles.authFormTitle}>Reset password</h2>{error && <div className={styles.errorMessage}>{error}</div>}<form action={submit}><div className="form-group"><label className="label" htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" required /></div><div className="form-group"><label className="label" htmlFor="code">6-digit code</label><input className="input" id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required /></div><div className="form-group"><label className="label" htmlFor="password">New password</label><input className="input" id="password" name="password" type="password" minLength={6} required /></div><button className={styles.authButton} disabled={loading}>{loading ? 'Resetting...' : 'Set new password'}</button></form></>;
}
