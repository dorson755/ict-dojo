import Header from '@/components/layout/Header';
import styles from './layout.module.css';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <Header />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
