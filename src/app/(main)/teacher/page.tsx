import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/aws/auth-utils';
import { UserRepository } from '@/lib/aws/repositories/user.repository';
import styles from './teacher.module.css';

export default async function TeacherDashboardPage() {
  const user = await getUserSession();
  if (!user) redirect('/login');
  if (user.role !== 'teacher') redirect('/dashboard');

  const profile = await UserRepository.getProfile(user.id);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Dojo mentor view</h1>
          <p className={styles.subtitle}>
            Guide learners through skill paths, without separate class rosters.
          </p>
        </div>
      </header>

      <section className={styles.emptyState}>
        <h2 className={styles.emptyTitle}>Welcome, {profile?.display_name || user.name || 'Mentor'}</h2>
        <p className={styles.emptyText}>
          The next step is a dojo-wide learner overview, grouped by domain, skill path,
          mastery, and recent practice. This removes the need for classroom enrollment data.
        </p>
      </section>
    </div>
  );
}
