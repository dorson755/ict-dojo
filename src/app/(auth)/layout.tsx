import React from 'react';
import styles from './auth.module.css';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h1 className={styles.authTitle}>ICT Dojo</h1>
          <p className={styles.authSubtitle}>Adaptive Learning Platform</p>
        </div>
        {children}
      </div>
    </div>
  );
}
