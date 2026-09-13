import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/aws/auth-utils';
import { UserRepository } from '@/lib/aws/repositories/user.repository';
import { MasteryRepository } from '@/lib/aws/repositories/mastery.repository';
import { ExerciseRepository } from '@/lib/aws/repositories/exercise.repository';
import styles from './parent.module.css';

export default async function ParentDashboardPage() {
  const user = await getUserSession();
  if (!user) redirect('/login');
  if (user.role !== 'parent') redirect('/dashboard');

  const profile = await UserRepository.getProfile(user.id);
  const linkedIds = profile?.linked_student_ids ?? [];
  const students = await Promise.all(linkedIds.map(async (studentId) => {
    const [student, mastery, sessions, dna] = await Promise.all([
      UserRepository.getProfile(studentId),
      MasteryRepository.getAllMastery(studentId).catch(() => []),
      ExerciseRepository.getRecentSessions(studentId, 20).catch(() => []),
      UserRepository.getTypingDNA(studentId).catch(() => null),
    ]);
    const weekAgo = new Date().getTime() - (7 * 86_400_000);
    const weekSessions = sessions.filter((session) => new Date(String(session.created_at)).getTime() >= weekAgo);
    return {
      id: studentId,
      name: student?.display_name || 'Learner',
      level: student?.platform_level ?? 1,
      streak: student?.streak_count ?? 0,
      sessions: weekSessions.length,
      averageMastery: mastery.length ? Math.round(mastery.reduce((sum, item) => sum + item.mastery_score, 0) / mastery.length) : 0,
      weakSkills: mastery.filter((item) => item.mastery_level === 'weak').length,
      accuracy: Math.round(dna?.avg_accuracy ?? 0),
    };
  }));

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Family progress</h1>
        <p className={styles.subtitle}>A calm weekly view of learning progress, practice habits, and support areas.</p>
      </header>
      {students.length === 0 ? (
        <section className={styles.empty}>
          <h2>No learner linked yet</h2>
          <p>A Dojo teacher or administrator can link a learner to this family account. Once linked, weekly progress will appear here.</p>
        </section>
      ) : (
        <div className={styles.list}>
          {students.map((student) => (
            <section className={styles.card} key={student.id}>
              <div className={styles.cardHeader}><div><h2>{student.name}</h2><p>Level {student.level} · {student.streak}-day streak</p></div><span className={styles.mastery}>{student.averageMastery}% mastery</span></div>
              <div className={styles.stats}><div><strong>{student.sessions}</strong><span>sessions this week</span></div><div><strong>{student.accuracy || '—'}{student.accuracy ? '%' : ''}</strong><span>average accuracy</span></div><div><strong>{student.weakSkills}</strong><span>skills to support</span></div></div>
              <p className={styles.support}>{student.weakSkills ? 'The Dojo is targeting a few developing skills through focused practice.' : 'The learner is building steady coverage across the current skill path.'}</p>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
