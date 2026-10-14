import styles from './dashboard.module.css';

export default function DashboardLoading() {
  return (
    <div className={styles.page} aria-busy="true" aria-label="Loading your dashboard">
      <div className={`${styles.hero} ${styles.skeleton}`}>
        <span className={styles.skeletonLine} style={{ width: '38%', height: 52 }} />
        <span className={styles.skeletonLine} style={{ width: '62%', height: 20 }} />
        <span className={styles.skeletonLine} style={{ width: '24%', height: 40 }} />
      </div>
      <div className={styles.grid}>
        <div className={styles.skillGrid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className={`${styles.skeletonLine} ${styles.skeletonCard}`} />
          ))}
        </div>
        <div className={styles.sidebar}>
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className={`${styles.skeletonLine} ${styles.skeletonSide}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
