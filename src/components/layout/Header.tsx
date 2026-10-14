import Link from 'next/link';
import { getUserSession } from '@/lib/aws/auth-utils';
import { UserRepository } from '@/lib/aws/repositories/user.repository';
import LogoutButton from './LogoutButton';
import NavLink from './NavLink';
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
      <Link href={user.role === 'teacher' ? '/teacher' : user.role === 'parent' ? '/parent' : '/dashboard'} className={styles.brand}>
        <span className={styles.brandMark}>ICT</span>
        Dojo
      </Link>

      <nav className={styles.nav} aria-label="Main">
        {user.role === 'student' && <NavLink href="/dashboard">Dashboard</NavLink>}
        {user.role === 'student' && <NavLink href="/practice">Practice</NavLink>}
        {user.role === 'student' && <NavLink href="/chunks">Chunks</NavLink>}
        {user.role === 'student' && <NavLink href="/profile">Profile</NavLink>}
        {user.role === 'student' && (
          <NavLink href="/document-craft/projects" matchPrefix="/document-craft">Documents</NavLink>
        )}
        {(profile?.platform_level ?? 1) >= 5 && <NavLink href="/programming">Programming</NavLink>}
        {user.role === 'teacher' && <NavLink href="/teacher">Teacher</NavLink>}
        {user.role === 'parent' && <NavLink href="/parent">Family</NavLink>}
      </nav>

      <div className={styles.userInfo}>
        {gradeLevel && (
          <span className={styles.gradeTag}>Grade {gradeLevel}</span>
        )}
        <LogoutButton />
      </div>
    </header>
  );
}
