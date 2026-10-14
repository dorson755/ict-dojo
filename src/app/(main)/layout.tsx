import Header from '@/components/layout/Header';
import styles from './layout.module.css';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Header />
      <main id="main-content" className={styles.content}>{children}</main>
    </div>
  );
}
