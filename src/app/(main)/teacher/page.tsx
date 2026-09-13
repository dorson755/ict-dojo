import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/aws/auth-utils';
import { UserRepository } from '@/lib/aws/repositories/user.repository';
import { MasteryRepository } from '@/lib/aws/repositories/mastery.repository';
import { ExerciseRepository } from '@/lib/aws/repositories/exercise.repository';
import styles from './teacher.module.css';

export default async function TeacherDashboardPage() {
  const user = await getUserSession();
  if (!user) redirect('/login');
  if (user.role !== 'teacher') redirect('/dashboard');

  const profile = await UserRepository.getProfile(user.id);
  const studentProfiles = await UserRepository.getStudentProfiles(user.id);
  const now = new Date().getTime();
  const students = await Promise.all(studentProfiles.map(async (student) => {
    const [mastery, sessions] = await Promise.all([
      MasteryRepository.getAllMastery(student.id).catch(() => []),
      ExerciseRepository.getRecentSessions(student.id, 1).catch(() => []),
    ]);
    const latestSession = sessions[0];
    const latestPractice = latestSession?.created_at ? new Date(latestSession.created_at) : null;
    const daysSincePractice = latestPractice
      ? Math.floor((now - latestPractice.getTime()) / 86_400_000)
      : null;
    const weakSkills = mastery.filter((item) => item.mastery_level === 'weak').length;
    const averageMastery = mastery.length
      ? Math.round(mastery.reduce((sum, item) => sum + item.mastery_score, 0) / mastery.length)
      : 0;
    return {
      ...student,
      averageMastery,
      weakSkills,
      latestPractice,
      daysSincePractice,
      needsAttention: weakSkills > 0 || daysSincePractice === null || daysSincePractice > 7,
    };
  }));
  const needsAttention = students.filter((student) => student.needsAttention);
  const activeThisWeek = students.filter((student) => student.daysSincePractice !== null && student.daysSincePractice <= 7).length;

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

      <p className={styles.welcome}>Welcome, {profile?.display_name || user.name || 'Mentor'}. Here&apos;s the health of the dojo.</p>

      <section className={styles.statsGrid}>
        <div className={styles.statCard}><span className={styles.statLabel}>Learners</span><strong className={styles.statValue}>{students.length}</strong><span className={styles.statHint}>Profiles in the dojo</span></div>
        <div className={styles.statCard}><span className={styles.statLabel}>Active this week</span><strong className={styles.statValue}>{activeThisWeek}</strong><span className={styles.statHint}>Practiced in the last 7 days</span></div>
        <div className={styles.statCard}><span className={styles.statLabel}>Needs attention</span><strong className={`${styles.statValue} ${styles.statWarning}`}>{needsAttention.length}</strong><span className={styles.statHint}>Weakness or inactivity signal</span></div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div><h2 className={styles.panelTitle}>Learner signals</h2><p className={styles.panelSubtitle}>Prioritized by mastery risk and recent practice.</p></div>
        </div>
        {students.length === 0 ? <p className={styles.emptyText}>Learners will appear here as they complete onboarding.</p> : (
          <div className={styles.learnerList}>
            {students.sort((a, b) => Number(b.needsAttention) - Number(a.needsAttention) || b.averageMastery - a.averageMastery).map((student) => (
              <div className={styles.learnerRow} key={student.id}>
                <div className={styles.learnerIdentity}><span className={styles.avatar}>{(student.display_name || 'S').slice(0, 1).toUpperCase()}</span><div><strong>{student.display_name || 'Unnamed learner'}</strong><span className={styles.learnerMeta}>Level {student.platform_level} · Grade {student.grade_level || '—'}</span></div></div>
                <div className={styles.learnerMetric}><strong>{student.averageMastery}%</strong><span>mastery</span></div>
                <div className={styles.learnerMetric}><strong>{student.weakSkills}</strong><span>weak skills</span></div>
                <span className={student.needsAttention ? styles.attentionBadge : styles.healthyBadge}>{student.needsAttention ? 'Review' : 'On track'}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
