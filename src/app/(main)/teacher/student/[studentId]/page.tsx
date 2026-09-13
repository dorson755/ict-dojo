import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getUserSession } from '@/lib/aws/auth-utils';
import { UserRepository } from '@/lib/aws/repositories/user.repository';
import { MasteryRepository } from '@/lib/aws/repositories/mastery.repository';
import { ExerciseRepository } from '@/lib/aws/repositories/exercise.repository';
import { TYPING_SKILLS } from '@/domains/typing/catalog';
import styles from './student.module.css';

export default async function StudentAnalyticsPage({ params }: { params: Promise<{ studentId: string }> }) {
  const user = await getUserSession();
  if (!user) redirect('/login');
  if (user.role !== 'teacher') redirect('/dashboard');
  const { studentId } = await params;
  const allowed = (await UserRepository.getStudentProfiles(user.id)).some((student) => student.id === studentId);
  if (!allowed) notFound();

  const [student, mastery, sessions] = await Promise.all([
    UserRepository.getProfile(studentId),
    MasteryRepository.getAllMastery(studentId),
    ExerciseRepository.getRecentSessions(studentId, 12),
  ]);
  if (!student) notFound();

  const recent = [...sessions].reverse();
  const averageAccuracy = recent.length ? Math.round(recent.reduce((sum, session) => sum + Number(session.accuracy || 0), 0) / recent.length) : 0;
  const averageWpm = recent.length ? Math.round(recent.reduce((sum, session) => sum + Number(session.wpm || 0), 0) / recent.length) : 0;
  const maxWpm = Math.max(...recent.map((session) => Number(session.wpm || 0)), 1);
  const averageMastery = mastery.length ? Math.round(mastery.reduce((sum, item) => sum + item.mastery_score, 0) / mastery.length) : 0;
  const mastered = mastery.filter((item) => item.mastery_level === 'mastered').length;
  const weak = mastery.filter((item) => item.mastery_level === 'weak').length;

  return (
    <div className={styles.page}>
      <Link href="/teacher" className={styles.back}>← Back to mentor view</Link>
      <header className={styles.header}><div className={styles.avatar}>{(student.display_name || 'L').slice(0, 1).toUpperCase()}</div><div><h1 className={styles.title}>{student.display_name || 'Learner'}</h1><p className={styles.subtitle}>Grade {student.grade_level || '—'} · Level {student.platform_level || 1} · {student.streak_count || 0}-day streak</p></div></header>
      <section className={styles.kpis}>
        <div><span>Mastery</span><strong>{averageMastery}%</strong></div><div><span>Sessions</span><strong>{recent.length}</strong></div><div><span>Avg WPM</span><strong>{averageWpm || '—'}</strong></div><div><span>Accuracy</span><strong>{averageAccuracy ? `${averageAccuracy}%` : '—'}</strong></div>
      </section>
      <div className={styles.grid}>
        <section className={styles.card}><h2>Practice trend</h2><p className={styles.caption}>Most recent sessions, oldest to newest.</p><div className={styles.chart}>{recent.length ? recent.map((session, index) => <div className={styles.barGroup} key={`${session.created_at}-${index}`}><div className={styles.bar} style={{ height: `${Math.max(8, (Number(session.wpm || 0) / maxWpm) * 100)}%` }} title={`${session.wpm || 0} WPM`} /><span>{index + 1}</span></div>) : <p className={styles.empty}>No sessions yet.</p>}</div></section>
        <section className={styles.card}><h2>Mastery snapshot</h2><p className={styles.caption}>{mastered} mastered · {weak} need reinforcement</p><div className={styles.masteryList}>{TYPING_SKILLS.map((skill) => { const item = mastery.find((entry) => entry.skill_id === skill.id); return <div className={styles.masteryRow} key={skill.id}><span>{skill.name}</span><strong>{Math.round(item?.mastery_score || 0)}%</strong><div className={styles.track}><i style={{ width: `${item?.mastery_score || 0}%` }} /></div></div>; })}</div></section>
      </div>
    </div>
  );
}
