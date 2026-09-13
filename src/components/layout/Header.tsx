import Link from 'next/link';
import { getUserSession } from '@/lib/aws/auth-utils';
import { UserRepository } from '@/lib/aws/repositories/user.repository';
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
        {user.role === 'student' && (
          <Link href="/profile" className={styles.navLink}>
            Profile
          </Link>
        )}
        {(profile?.platform_level ?? 1) >= 5 && (
          <Link
            href="/programming"
            className={styles.navLink}
          >
            Programming
          </Link>
        )}
        {user.role === 'teacher' && (
          <Link
            href="/teacher"
            className={styles.navLink}
          >
            Teacher
          </Link>
        )}
        {user.role === 'parent' && (
          <Link href="/parent" className={styles.navLink}>
            Family
          </Link>
        )}
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
