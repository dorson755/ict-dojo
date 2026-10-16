'use client';

import { usePathname } from 'next/navigation';
import BeltRack from './BeltRack';
import styles from './auth.module.css';

/** Wraps every auth page in the card. Only the login page gets the belt rack beside it. */
export default function AuthShell({ children }: { children: React.ReactNode }) {
  const showRack = usePathname() === '/login';

  return (
    <main className={`${styles.authContainer} ${showRack ? styles.authSplit : ''}`}>
      {showRack && <BeltRack />}
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <div className={styles.brandRow}>
            <span className={styles.brandMark}>ICT</span>
            <span className={styles.brandName}>Dojo</span>
          </div>
          <p className={styles.authSubtitle}>Typing, documents and code, one belt at a time.</p>
        </div>
        {children}
      </div>
    </main>
  );
}
