import Link from 'next/link';
import { getUserSession } from '@/lib/firebase/auth-utils';
import { UserRepository } from '@/lib/firebase/repositories/user.repository';
import { logout } from '@/app/(auth)/actions';
import styles from './Header.module.css';

export default async function Header() {
  const user = await getUserSession();

  if (!user) {
    return null;
  }

  const profile = await UserRepository.getProfile(user.id);
  const gradeLevel = profile?.grade_level;

  return (
    <header className={styles.header}>
      <Link href="/dashboard" className={styles.brand}>
        <span className={styles.brandMark}>ICT</span>
        Dojo
      </Link>

      <nav className={styles.nav}>
        <Link
          href="/dashboard"
          className={styles.navLink}
        >
          Dashboard
        </Link>
        <Link
          href="/practice"
          className={styles.navLink}
        >
          Practice
        </Link>
      </nav>

      <div className={styles.userInfo}>
        {gradeLevel && (
          <span className={styles.gradeTag}>Grade {gradeLevel}</span>
        )}
        <form action={logout}>
          <button type="submit" className={styles.logoutBtn}>
            Log out
          </button>
        </form>
      </div>
    </header>
  );
}
