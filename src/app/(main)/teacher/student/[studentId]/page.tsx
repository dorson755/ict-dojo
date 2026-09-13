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
        <section className={styles.card}>
          <h2>Practice trend</h2>
          <p className={styles.caption}>WPM and accuracy across the last {recent.length} sessions.</p>
          <div className={styles.legend}><span><i className={styles.legendWpm} /> WPM</span><span><i className={styles.legendAccuracy} /> Accuracy</span></div>
          <div className={styles.chartScale}><span>100</span><span>50</span><span>0</span></div>
          <div className={styles.chart}>
            {recent.length ? recent.map((session, index) => {
              const wpm = Number(session.wpm || 0);
              const accuracy = Number(session.accuracy || 0);
              const date = session.created_at ? new Date(String(session.created_at)) : null;
              return <div className={styles.barGroup} key={`${session.created_at}-${index}`} title={`${date?.toLocaleDateString() || 'Session'}: ${wpm} WPM, ${accuracy}% accuracy`}>
                <div className={styles.barPair}><div className={`${styles.bar} ${styles.barWpm}`} style={{ height: `${Math.max(6, (wpm / maxWpm) * 100)}%` }} /><div className={`${styles.bar} ${styles.barAccuracy}`} style={{ height: `${Math.max(6, accuracy)}%` }} /></div>
                <span>{date ? `${date.getMonth() + 1}/${date.getDate()}` : index + 1}</span>
              </div>;
            }) : <p className={styles.empty}>No sessions yet.</p>}
          </div>
        </section>
        <section className={styles.card}>
          <h2>Mastery snapshot</h2>
          <p className={styles.caption}>{mastered} mastered · {weak} need reinforcement · scores update after each session</p>
          <div className={styles.masteryList}>{TYPING_SKILLS.map((skill) => {
            const item = mastery.find((entry) => entry.skill_id === skill.id);
            const score = Math.round(item?.mastery_score || 0);
            return <div className={styles.masteryRow} key={skill.id}><span>{skill.name}<small>{item ? `${item.practice_count} session${item.practice_count === 1 ? '' : 's'} · ${item.mastery_level}` : 'Not started'}</small></span><strong>{item ? `${score}%` : '—'}</strong><div className={styles.track}><i style={{ width: `${score}%` }} /></div></div>;
          })}</div>
        </section>
      </div>
    </div>
  );
}
