'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import styles from '@/components/ui/StatusPage.module.css';

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
    <div className={styles.wrap} role="alert">
      <p className={styles.code}>Error</p>
      <h2 className={styles.title}>We couldn&apos;t load this page.</h2>
      <p className={styles.message}>
        {error.message || 'Something unexpected happened. Try again, and if it keeps failing, go back to your dashboard.'}
      </p>
      {error.digest && <p className={styles.meta}>Reference {error.digest}</p>}
      <div className={styles.actions}>
        <button type="button" onClick={reset} className="btn btn-primary">
          Try again
        </button>
        <Link href="/dashboard" className="btn btn-secondary">
          Dashboard
        </Link>
      </div>
    </div>
  );
}
