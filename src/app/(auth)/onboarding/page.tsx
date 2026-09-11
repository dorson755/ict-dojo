'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitOnboarding } from './actions';
import styles from '../auth.module.css';

export default function OnboardingPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);

  const handleSubmit = async (formData: FormData) => {
    if (!selectedGrade) {
      setError('Please select a grade level.');
      return;
    }

    setIsLoading(true);
    setError(null);
    formData.append('gradeLevel', selectedGrade.toString());

    const result = await submitOnboarding(formData);
    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  const gradeOptions = Array.from({ length: 12 }, (_, i) => ({
    label: `Grade ${i + 1}`,
    value: i + 1,
  }));

  return (
    <>
      <h2 className={styles.authFormTitle}>Welcome to the dojo</h2>
      <p className={styles.authDesc}>
        Let&apos;s personalize your training. What grade are you in?
      </p>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <form action={handleSubmit}>
        <div className={styles.gradeGrid}>
          {gradeOptions.map((grade) => (
            <button
              key={grade.value}
              type="button"
              onClick={() => setSelectedGrade(grade.value)}
              className={`${styles.gradeBtn} ${selectedGrade === grade.value ? styles.gradeBtnSelected : ''}`}
            >
              {grade.label}
            </button>
          ))}
        </div>

        <button
          type="submit"
          className={styles.authButton}
          disabled={isLoading || !selectedGrade}
        >
          {isLoading ? 'Saving...' : 'Start training'}
        </button>
      </form>
    </>
  );
}
