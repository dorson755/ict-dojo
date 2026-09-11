'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[ICT Dojo Error]', error);
  }, [error]);

  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      padding: '2rem',
      textAlign: 'center',
    }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Something went wrong</h2>
      <p style={{ color: 'var(--text-muted, #888)', maxWidth: '400px' }}>
        {error.message || 'An unexpected error occurred loading this page.'}
      </p>
      {error.digest && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #888)' }}>
          Error ID: {error.digest}
        </p>
      )}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <button
          onClick={reset}
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '6px',
            background: 'var(--accent, #6366f1)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '6px',
            background: 'transparent',
            border: '1px solid var(--border, #333)',
            color: 'inherit',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
