'use client';

import React, { useState } from 'react';
import TypingEngine from '@/components/typing/TypingEngine';
import { submitTypingSession } from './actions';
import { TypingSessionInput, TypingSessionResult } from '@/domains/typing/types';
import Link from 'next/link';

interface PracticeClientProps {
  studentId: string;
  exercise: any; // Type strictly later
}

export default function PracticeClient({ studentId, exercise }: PracticeClientProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<TypingSessionResult | null>(null);
  const [nextRec, setNextRec] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = async (sessionData: TypingSessionInput) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await submitTypingSession(sessionData);
      if (response.success && response.result) {
        setResult(response.result as TypingSessionResult);
        setNextRec(response.nextRecommendation);
      } else {
        setError(response.reason || 'Failed to submit session.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error) {
    return (
      <div style={{ backgroundColor: '#fef2f2', color: '#b91c1c', padding: '1rem', borderRadius: '8px' }}>
        <h3>Error processing session</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}>
          Try Again
        </button>
      </div>
    );
  }

  if (result) {
    return (
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', textAlign: 'center' }}>
          Session Complete!
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ textAlign: 'center', padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase' }}>WPM</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb' }}>{result.wpm}</div>
          </div>
          <div style={{ textAlign: 'center', padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase' }}>Accuracy</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#16a34a' }}>{result.accuracy}%</div>
          </div>
          <div style={{ textAlign: 'center', padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase' }}>Score</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#8b5cf6' }}>{result.compositeScore}</div>
          </div>
        </div>

        {nextRec && (
          <div style={{ padding: '1rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', marginBottom: '2rem' }}>
            <h4 style={{ color: '#1e40af', fontWeight: 'bold', marginBottom: '0.5rem' }}>Next Recommendation</h4>
            <p style={{ color: '#1e3a8a' }}>{nextRec.reason}</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link href="/dashboard" style={{ padding: '0.75rem 1.5rem', backgroundColor: '#f1f5f9', color: '#334155', borderRadius: '6px', textDecoration: 'none', fontWeight: '600' }}>
            Back to Dashboard
          </Link>
          <button 
            onClick={() => window.location.reload()}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: 'white', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: 'pointer' }}
          >
            Practice Next Skill
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {isSubmitting && (
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.8)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}>
          <div style={{ fontWeight: 'bold', color: '#2563eb' }}>Analyzing session...</div>
        </div>
      )}
      
      <TypingEngine
        passage={exercise.content.passage}
        studentId={studentId}
        exerciseId={exercise.id}
        skillIds={exercise.skill_ids}
        onComplete={handleComplete}
      />
      
      {exercise.content.hint && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#fef3c7', color: '#b45309', borderRadius: '8px', textAlign: 'center' }}>
          <strong>Hint:</strong> {exercise.content.hint}
        </div>
      )}
    </div>
  );
}
