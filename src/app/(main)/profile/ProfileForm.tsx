'use client';

import { useState } from 'react';
import { confirmStudentEmail, updateStudentProfile } from './actions';
import styles from './profile.module.css';

export default function ProfileForm({ displayName, email, gradeLevel }: { displayName: string; email: string; gradeLevel: number }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true); setMessage(null); setError(null);
    const result = await updateStudentProfile(formData);
    if (result.error) setError(result.error);
    else {
      setNeedsEmailVerification(Boolean(result.needsEmailVerification));
      setMessage(result.needsEmailVerification
        ? 'Name and grade saved. Check your new email for a verification code.'
        : 'Profile saved.');
    }
    setLoading(false);
  }

  async function confirmEmail(formData: FormData) {
    setVerifying(true); setMessage(null); setError(null);
    const result = await confirmStudentEmail(String(formData.get('code') || ''));
    if (result.error) setError(result.error);
    else {
      setNeedsEmailVerification(false);
      setMessage('Email verified. Sign in again to refresh your account session.');
    }
    setVerifying(false);
  }

  return <>
    <form action={submit} className={styles.form}>
      {message && <p className={styles.success}>{message}</p>}
      {error && <p className={styles.error}>{error}</p>}
      <label className={styles.label} htmlFor="displayName">Display name</label>
      <input className={styles.input} id="displayName" name="displayName" defaultValue={displayName} maxLength={50} required />
      <label className={styles.label} htmlFor="email">Email</label>
      <input className={styles.input} id="email" name="email" type="email" defaultValue={email} maxLength={254} autoComplete="email" required />
      <p className={styles.hint}>Changing your email sends a verification code to the new address.</p>
      <label className={styles.label} htmlFor="gradeLevel">Grade level</label>
      <select className={styles.input} id="gradeLevel" name="gradeLevel" defaultValue={gradeLevel}>{Array.from({ length: 12 }, (_, index) => <option value={index + 1} key={index + 1}>Grade {index + 1}</option>)}</select>
      <button className={styles.save} disabled={loading}>{loading ? 'Saving...' : 'Save profile'}</button>
    </form>
    {needsEmailVerification && (
      <form action={confirmEmail} className={styles.verification}>
        <label className={styles.label} htmlFor="emailCode">Email verification code</label>
        <input className={styles.input} id="emailCode" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{4,8}" required />
        <button className={styles.save} disabled={verifying}>{verifying ? 'Verifying...' : 'Verify email'}</button>
      </form>
    )}
  </>;
}
