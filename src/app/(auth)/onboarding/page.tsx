'use client';

import { useState } from 'react';
import { completeOnboarding } from './actions';
import styles from '../auth.module.css';

export default function OnboardingPage() {
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
    
    const result = await completeOnboarding(formData);
    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
    }
  };

  const gradeOptions = [
    { label: 'Grade 1', value: 1 },
    { label: 'Grade 2', value: 2 },
    { label: 'Grade 3', value: 3 },
    { label: 'Grade 4', value: 4 },
    { label: 'Grade 5', value: 5 },
    { label: 'Grade 6', value: 6 },
    { label: 'Grade 7', value: 7 },
    { label: 'Grade 8', value: 8 },
    { label: 'Grade 9', value: 9 },
    { label: 'Grade 10', value: 10 },
    { label: 'Grade 11', value: 11 },
    { label: 'Grade 12', value: 12 },
  ];

  return (
    <>
      <h2 className={styles.authTitle} style={{ fontSize: '1.25rem', textAlign: 'center' }}>
        Welcome to the Dojo!
      </h2>
      <p className={styles.authSubtitle} style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        Let's personalize your learning experience. What grade are you in?
      </p>
      
      {error && <div className={styles.errorMessage}>{error}</div>}

      <form action={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {gradeOptions.map((grade) => (
            <button
              key={grade.value}
              type="button"
              onClick={() => setSelectedGrade(grade.value)}
              style={{
                padding: '0.75rem',
                border: `2px solid ${selectedGrade === grade.value ? '#3b82f6' : '#cbd5e1'}`,
                borderRadius: '8px',
                backgroundColor: selectedGrade === grade.value ? '#eff6ff' : 'white',
                color: selectedGrade === grade.value ? '#1d4ed8' : '#334155',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {grade.label}
            </button>
          ))}
        </div>

        <button type="submit" className={styles.button} disabled={isLoading || !selectedGrade}>
          {isLoading ? 'Saving...' : 'Start Learning'}
        </button>
      </form>
    </>
  );
}
