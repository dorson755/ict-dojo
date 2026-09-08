import React from 'react';
import styles from './auth.module.css';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <div className={styles.brandRow}>
            <span className={styles.brandMark}>ICT</span>
            <span className={styles.brandName}>Dojo</span>
          </div>
          <p className={styles.authSubtitle}>Adaptive Learning Platform</p>
        </div>
        {children}
      </div>
    </div>
  );
}
