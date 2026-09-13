'use client';

import { useState } from 'react';
import { updateStudentProfile } from './actions';
import styles from './profile.module.css';

export default function ProfileForm({ displayName, gradeLevel }: { displayName: string; gradeLevel: number }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true); setMessage(null); setError(null);
    const result = await updateStudentProfile(formData);
    if (result.error) setError(result.error);
    else setMessage('Profile saved.');
    setLoading(false);
  }

  return <form action={submit} className={styles.form}>
    {message && <p className={styles.success}>{message}</p>}
    {error && <p className={styles.error}>{error}</p>}
    <label className={styles.label} htmlFor="displayName">Display name</label>
    <input className={styles.input} id="displayName" name="displayName" defaultValue={displayName} maxLength={50} required />
    <label className={styles.label} htmlFor="gradeLevel">Grade level</label>
    <select className={styles.input} id="gradeLevel" name="gradeLevel" defaultValue={gradeLevel}>{Array.from({ length: 12 }, (_, index) => <option value={index + 1} key={index + 1}>Grade {index + 1}</option>)}</select>
    <button className={styles.save} disabled={loading}>{loading ? 'Saving...' : 'Save profile'}</button>
  </form>;
}
