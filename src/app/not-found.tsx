import Link from 'next/link';
import styles from '@/components/ui/StatusPage.module.css';

export default function NotFound() {
  return (
    <main className={styles.wrap}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>That page isn&apos;t in the dojo.</h1>
      <p className={styles.message}>
        The link may be out of date, or the page may have moved. Head back to your dashboard to
        pick up where you left off.
      </p>
      <div className={styles.actions}>
        <Link href="/dashboard" className="btn btn-primary">Go to dashboard</Link>
        <Link href="/practice" className="btn btn-secondary">Open practice</Link>
      </div>
    </main>
  );
}
