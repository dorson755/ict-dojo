import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/aws/auth-utils';
import Link from 'next/link';
import { getTeacherReport } from './report';
import { STATUS_LABEL, STATUS_PRIORITY, type LearnerStatus } from './learner-status';
import styles from './teacher.module.css';

const BADGE_CLASS: Record<LearnerStatus, string> = {
  needs_reinforcement: styles.attentionBadge,
  inactive: styles.inactiveBadge,
  on_track: styles.healthyBadge,
  not_started: styles.notStartedBadge,
};

export default async function TeacherDashboardPage() {
  const user = await getUserSession();
  if (!user) redirect('/login');
  if (user.role !== 'teacher' && user.role !== 'admin') redirect('/dashboard');

  const students = await getTeacherReport(user.id);
  const needsAttention = students.filter((student) => student.needsAttention);
  const activeThisWeek = students.filter((student) => student.sessionsThisWeek > 0).length;
  const totalSessions = students.reduce((sum, student) => sum + student.sessionsThisWeek, 0);
  const totalMinutes = students.reduce((sum, student) => sum + student.minutesThisWeek, 0);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Dojo mentor view</h1>
          <p className={styles.subtitle}>
            Guide learners through skill paths, without separate class rosters.
          </p>
        </div>
        <Link className="btn btn-secondary" href="/teacher/export">Export CSV</Link>
      </header>

      <p className={styles.welcome}>Welcome, {user.name || 'Mentor'}. Here&apos;s the health of the dojo.</p>

      <section className={styles.statsGrid}>
        <div className={styles.statCard}><span className={styles.statLabel}>Learners</span><strong className={styles.statValue}>{students.length}</strong><span className={styles.statHint}>Profiles in the dojo</span></div>
        <div className={styles.statCard}><span className={styles.statLabel}>Active this week</span><strong className={styles.statValue}>{activeThisWeek}</strong><span className={styles.statHint}>Practiced in the last 7 days</span></div>
        <div className={styles.statCard}><span className={styles.statLabel}>Needs attention</span><strong className={`${styles.statValue} ${styles.statWarning}`}>{needsAttention.length}</strong><span className={styles.statHint}>Struggling or inactive learners</span></div>
        <div className={styles.statCard}><span className={styles.statLabel}>Practice this week</span><strong className={styles.statValue}>{totalSessions}</strong><span className={styles.statHint}>{totalMinutes} minutes across the dojo</span></div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div><h2 className={styles.panelTitle}>Learner signals</h2><p className={styles.panelSubtitle}>Prioritized by mastery risk and recent practice.</p></div>
        </div>
        {students.length === 0 ? <p className={styles.emptyText}>Learners will appear here as they complete onboarding.</p> : (
          <div className={styles.learnerList}>
            {[...students].sort((a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status] || b.averageMastery - a.averageMastery).map((student) => (
              <Link className={styles.learnerLink} href={`/teacher/student/${student.id}`} key={student.id}>
              <div className={styles.learnerRow}>
                <div className={styles.learnerIdentity}><span className={styles.avatar}>{(student.display_name || 'S').slice(0, 1).toUpperCase()}</span><div><strong>{student.display_name || 'Unnamed learner'}</strong><span className={styles.learnerMeta}>Level {student.platform_level} · Grade {student.grade_level || '—'}</span></div></div>
                <div className={styles.learnerMetric}><strong>{student.hasStarted ? `${student.averageMastery}%` : '—'}</strong><span>mastery</span></div>
                <div className={styles.learnerMetric}><strong>{student.hasStarted ? student.sessionsThisWeek : '—'}</strong><span>{student.hasStarted ? `sessions · ${student.minutesThisWeek}m` : 'no practice yet'}</span></div>
                <div className={styles.learnerMetric}><strong>{student.hasStarted && student.averageAccuracy ? `${student.averageAccuracy}%` : '—'}</strong><span>accuracy · {student.hasStarted && student.averageWpm ? `${student.averageWpm} WPM` : '—'}</span></div>
                <div className={styles.learnerMetric}><strong>{student.hasStarted ? student.weakSkills : '—'}</strong><span>weak skills</span></div>
                <span className={BADGE_CLASS[student.status]} title={student.reason}>{STATUS_LABEL[student.status]}</span>
              </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
