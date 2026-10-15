import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getUserSession } from '@/lib/aws/auth-utils';
import { UserRepository } from '@/lib/aws/repositories/user.repository';
import { MasteryRepository } from '@/lib/aws/repositories/mastery.repository';
import { ExerciseRepository } from '@/lib/aws/repositories/exercise.repository';
import { getCognitoProfileForTeacher } from '@/lib/aws/cognito-profile';
import { TYPING_SKILLS } from '@/domains/typing/catalog';
import { LineChart } from '@/components/charts/LineChart';
import { averageCatalogMastery, countWeakSkills } from '../../learner-status';
import { dailySeries, shortDay, summarizeWpm, validSessions } from '../../progress';
import styles from './student.module.css';

const CATALOG_SKILL_IDS: ReadonlySet<string> = new Set(TYPING_SKILLS.map((skill) => skill.id));
const HISTORY_LIMIT = 200;

export default async function StudentAnalyticsPage({ params }: { params: Promise<{ studentId: string }> }) {
  const user = await getUserSession();
  if (!user) redirect('/login');
  if (user.role !== 'teacher' && user.role !== 'admin') redirect('/dashboard');
  const { studentId } = await params;
  const allowed = (await UserRepository.getStudentProfiles(user.id)).some((student) => student.id === studentId);
  if (!allowed) notFound();

  const [student, mastery, sessions, cognitoProfile] = await Promise.all([
    UserRepository.getProfile(studentId),
    MasteryRepository.getAllMastery(studentId),
    ExerciseRepository.getRecentSessions(studentId, HISTORY_LIMIT),
    getCognitoProfileForTeacher(studentId).catch(() => null),
  ]);
  if (!student) notFound();

  const valid = validSessions(sessions);
  const series = dailySeries(sessions);
  const summary = summarizeWpm(series);
  const averageAccuracy = valid.length ? Math.round(valid.reduce((sum, session) => sum + Number(session.accuracy || 0), 0) / valid.length) : 0;
  const chartPoints = series.map((point) => ({
    label: shortDay(point.day),
    value: point.wpm,
    secondary: point.accuracy || undefined,
    detail: `${point.sessions} session${point.sessions === 1 ? '' : 's'}${point.accuracy ? `, ${point.accuracy}% accuracy` : ''}`,
  }));
  const trendLabel = summary.direction === 'none'
    ? 'No sessions yet'
    : summary.points < 2
      ? 'Needs another practice day'
      : summary.direction === 'flat'
        ? 'Holding steady'
        : `${summary.change > 0 ? '+' : ''}${summary.change} WPM across practice days`;
  const averageMastery = averageCatalogMastery(mastery, CATALOG_SKILL_IDS);
  const mastered = mastery.filter((item) => CATALOG_SKILL_IDS.has(item.skill_id) && item.mastery_level === 'mastered').length;
  const weak = countWeakSkills(mastery, CATALOG_SKILL_IDS);
  const assessedSkills = mastery.filter((item) => CATALOG_SKILL_IDS.has(item.skill_id) && item.practice_count > 0).length;
  const joinedAt = cognitoProfile?.createdAt
    ?? (student.created_at ? new Date(student.created_at) : null);
  const lastPractice = sessions[0]?.created_at
    ? new Date(String(sessions[0].created_at))
    : null;

  return (
    <div className={styles.page}>
      <Link href="/teacher" className={styles.back}>← Back to mentor view</Link>
      <header className={styles.header}><div className={styles.avatar}>{(student.display_name || 'L').slice(0, 1).toUpperCase()}</div><div><h1 className={styles.title}>{student.display_name || 'Learner'}</h1><p className={styles.subtitle}>Grade {student.grade_level || '—'} · Level {student.platform_level || 1} · {student.streak_count || 0}-day streak</p></div></header>
      <section className={styles.kpis}>
        <div><span>Assessed mastery</span><strong>{assessedSkills ? `${averageMastery}%` : '—'}</strong><small>{assessedSkills} of {TYPING_SKILLS.length} skills assessed</small></div><div><span>Latest speed</span><strong>{summary.latest ? Math.round(summary.latest) : '—'}</strong><small>{summary.best ? `WPM · best ${Math.round(summary.best)}` : 'WPM'}</small></div><div><span>Accuracy</span><strong>{averageAccuracy ? `${averageAccuracy}%` : '—'}</strong><small>across {valid.length} session{valid.length === 1 ? '' : 's'}</small></div><div><span>Practice days</span><strong>{series.length}</strong><small>{trendLabel}</small></div>
      </section>
      <section className={styles.profileCard}>
        <div className={styles.profileCardHeader}>
          <div>
            <h2>Profile information</h2>
            <p>Account and learner details for this student.</p>
          </div>
          <span className={styles.accountStatus}>
            {!cognitoProfile ? 'Status unavailable' : cognitoProfile.enabled === false ? 'Disabled' : cognitoProfile.status === 'UNCONFIRMED' ? 'Email unconfirmed' : 'Active'}
          </span>
        </div>
        <dl className={styles.profileDetails}>
          <div><dt>Name</dt><dd>{student.display_name || cognitoProfile?.name || '—'}</dd></div>
          <div><dt>Email</dt><dd>{cognitoProfile?.email || student.email || '—'}</dd></div>
          <div><dt>Grade</dt><dd>{student.grade_level ? `Grade ${student.grade_level}` : '—'}</dd></div>
          <div><dt>Level and XP</dt><dd>Level {student.platform_level || 1} · {student.xp_total || 0} XP</dd></div>
          <div><dt>Streak</dt><dd>{student.streak_count || 0} day{student.streak_count === 1 ? '' : 's'}</dd></div>
          <div><dt>Joined</dt><dd>{joinedAt ? joinedAt.toLocaleDateString() : '—'}</dd></div>
          <div><dt>Last practice</dt><dd>{lastPractice ? lastPractice.toLocaleDateString() : 'Not started'}</dd></div>
          <div><dt>Account updated</dt><dd>{cognitoProfile?.updatedAt ? cognitoProfile.updatedAt.toLocaleDateString() : '—'}</dd></div>
        </dl>
      </section>
      <section className={`${styles.card} ${styles.wide}`}>
        <h2>Typing speed over time</h2>
        <p className={styles.caption}>
          One point per practice day, averaging that day&apos;s sessions. Dotted line is accuracy on the right axis.
        </p>
        <LineChart
          points={chartPoints}
          title="Words per minute"
          secondaryName="Accuracy"
          referenceValue={summary.best}
          referenceLabel={`Personal best ${Math.round(summary.best)}`}
        />
      </section>
      <div className={styles.grid}>
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
