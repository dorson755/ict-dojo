import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getUserSession } from '@/lib/aws/auth-utils';
import { UserRepository } from '@/lib/aws/repositories/user.repository';
import { MasteryRepository } from '@/lib/aws/repositories/mastery.repository';
import { ExerciseRepository } from '@/lib/aws/repositories/exercise.repository';
import { getCognitoProfileForTeacher } from '@/lib/aws/cognito-profile';
import { TYPING_SKILLS } from '@/domains/typing/catalog';
import { LineChart } from '@/components/charts/LineChart';
import { KeyboardHeat } from '@/components/charts/KeyboardHeat';
import { Sparkline } from '@/components/charts/Sparkline';
import { getBeltColor, getBeltName } from '@/components/ui/BeltBadge';
import { countWeakSkills } from '../../learner-status';
import { masteryExplanation, summarizeMastery } from '../../mastery-summary';
import { masteryLevelName } from '@/domains/shared/mastery-labels';
import { beltBlockerSummary, beltGateRows, beltStatus } from '../../belt-status';
import { dailySeries, daysSinceLatest, shortDay, summarizeWpm, validSessions } from '../../progress';
import {
  modeBreakdown,
  practiceRhythm,
  problemKeys,
  progressNarrative,
  skillGrowth,
  spokenPair,
  topPairSlips,
  visiblePair,
  type MasteryHistoryRow,
} from '../../personal-trends';
import styles from './student.module.css';

const CATALOG_SKILL_IDS: ReadonlySet<string> = new Set(TYPING_SKILLS.map((skill) => skill.id));
const HISTORY_LIMIT = 200;

// Reading the clock inside a component body trips the React purity rule, so it is isolated here.
async function currentTime(): Promise<number> {
  return Date.now();
}

export default async function StudentAnalyticsPage({ params }: { params: Promise<{ studentId: string }> }) {
  const user = await getUserSession();
  if (!user) redirect('/login');
  if (user.role !== 'teacher' && user.role !== 'admin') redirect('/dashboard');
  const { studentId } = await params;
  const requestTime = await currentTime();
  const allowed = (await UserRepository.getStudentProfiles(user.id)).some((student) => student.id === studentId);
  if (!allowed) notFound();

  const [student, mastery, sessions, cognitoProfile, history, dna] = await Promise.all([
    UserRepository.getProfile(studentId),
    MasteryRepository.getAllMastery(studentId),
    ExerciseRepository.getRecentSessions(studentId, HISTORY_LIMIT),
    getCognitoProfileForTeacher(studentId).catch(() => null),
    MasteryRepository.getMasteryHistory(studentId).catch(() => []),
    UserRepository.getTypingDNA(studentId).catch(() => null),
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
  const masterySummary = summarizeMastery(mastery, CATALOG_SKILL_IDS);
  const mastered = mastery.filter((item) => CATALOG_SKILL_IDS.has(item.skill_id) && item.mastery_level === 'mastered').length;
  const weak = countWeakSkills(mastery, CATALOG_SKILL_IDS);
  const modes = modeBreakdown(sessions);
  const rhythm = practiceRhythm(sessions);
  const growth = skillGrowth(history as MasteryHistoryRow[], CATALOG_SKILL_IDS);
  const keys = problemKeys(dna?.weak_keys);
  const pairs = topPairSlips(sessions);
  const skillName = (id: string) => TYPING_SKILLS.find((skill) => skill.id === id)?.name ?? id;
  const belt = beltStatus({
    level: student.platform_level ?? 1,
    examPassed: student.belt_exam_passed,
    mastery,
  });
  const gateRows = beltGateRows(belt, skillName);
  const gatesMet = gateRows.filter((row) => row.met).length;
  const firstDay = series[0];
  const lastDay = series[series.length - 1];
  const weakSkillNames = mastery
    .filter((item) => CATALOG_SKILL_IDS.has(item.skill_id) && item.mastery_level === 'weak')
    .map((item) => skillName(item.skill_id));
  const narrative = progressNarrative({
    practiceDays: series.length,
    sessions: valid.length,
    firstWpm: firstDay?.wpm ?? 0,
    latestWpm: lastDay?.wpm ?? 0,
    bestWpm: summary.best,
    firstAccuracy: firstDay?.accuracy ?? 0,
    latestAccuracy: lastDay?.accuracy ?? 0,
    weakSkillNames,
    masteredCount: mastered,
    daysSincePractice: daysSinceLatest(sessions, requestTime),
  });
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
        <div title={masteryExplanation(masterySummary)}><span>Skills assessed</span><strong>{masterySummary.assessed} of {masterySummary.total}</strong><small>{masterySummary.assessed ? `${masterySummary.secure} strong or better · avg score ${masterySummary.averageScore}` : 'No skills scored yet'}</small></div><div><span>Latest speed</span><strong>{summary.latest ? Math.round(summary.latest) : '—'}</strong><small>{summary.best ? `WPM · best ${Math.round(summary.best)}` : 'WPM'}</small></div><div><span>Accuracy</span><strong>{averageAccuracy ? `${averageAccuracy}%` : '—'}</strong><small>across {valid.length} session{valid.length === 1 ? '' : 's'}</small></div><div><span>Practice days</span><strong>{series.length}</strong><small>{trendLabel}</small></div>
      </section>
      <section className={styles.narrative} aria-label="Progress summary">
        <h2 className={styles.narrativeHeadline}>{narrative.headline}</h2>
        {narrative.points.length > 0 && (
          <ul className={styles.narrativeList}>
            {narrative.points.map((point) => <li key={point}>{point}</li>)}
          </ul>
        )}
      </section>
      <section className={styles.beltCard} aria-label="Belt journey">
        <div className={styles.beltHead}>
          <div className={styles.beltCurrent}>
            <i className={styles.beltStripLarge} style={{ background: getBeltColor(belt.belt) }} aria-hidden="true" />
            <div>
              <span className={styles.beltEyebrow}>Current belt</span>
              <h2 className={styles.beltTitle}>{getBeltName(belt.belt)} belt</h2>
            </div>
          </div>
          <span className={belt.examReady ? styles.beltReadyChip : styles.beltNoteChip}>{beltBlockerSummary(belt)}</span>
        </div>
        {belt.nextBelt === null ? (
          <p className={styles.caption}>This learner holds the top belt.</p>
        ) : (
          <>
            <p className={styles.caption}>
              Toward the {getBeltName(belt.nextBelt)} belt: {gatesMet} of {gateRows.length} requirements met.
              A belt only promotes when XP, skills, and the exam are all done.
            </p>
            <ul className={styles.gateList}>
              {gateRows.map((row) => (
                <li key={row.key} className={row.met ? styles.gateMet : styles.gateOpen}>
                  <span className={styles.gateMark} aria-hidden="true">{row.met ? '✓' : ''}</span>
                  <span className={styles.gateLabel}>{row.label}</span>
                  <span className={styles.gateDetail}>
                    <span className={styles.srOnly}>{row.met ? 'Met. ' : 'Not met. '}</span>{row.detail}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
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
          <h2>Where practice goes</h2>
          <p className={styles.caption}>
            Average speed and accuracy by practice mode. A mode with high speed but low accuracy is where a learner may be rushing.
          </p>
          {modes.length === 0 ? <p className={styles.emptyNote}>No sessions yet.</p> : (
            <table className={styles.modeTable}>
              <thead><tr><th scope="col">Mode</th><th scope="col">Sessions</th><th scope="col">Speed</th><th scope="col">Accuracy</th></tr></thead>
              <tbody>
                {modes.map((mode) => (
                  <tr key={mode.mode}>
                    <th scope="row">{mode.label}</th>
                    <td>{mode.sessions}</td>
                    <td>{mode.wpm} <small>WPM</small></td>
                    <td>
                      {mode.accuracy ? `${mode.accuracy}%` : '—'}
                      {mode.accuracy > 0 && <i className={styles.modeMeter}><b style={{ width: `${mode.accuracy}%` }} /></i>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {rhythm.activeDays > 0 && (
            <dl className={styles.rhythm}>
              <div><dt>Practice days</dt><dd>{rhythm.activeDays} <small>over {rhythm.spanDays} day{rhythm.spanDays === 1 ? '' : 's'}</small></dd></div>
              <div><dt>Longest run</dt><dd>{rhythm.longestStreak} <small>day{rhythm.longestStreak === 1 ? '' : 's'} in a row</small></dd></div>
              <div><dt>Per practice day</dt><dd>{rhythm.sessionsPerActiveDay} <small>session{rhythm.sessionsPerActiveDay === 1 ? '' : 's'}</small></dd></div>
            </dl>
          )}
        </section>
        <section className={styles.card}>
          <h2>Problem keys</h2>
          <p className={styles.caption}>
            The ten keys this learner misses most, shaded against their own worst key. Keys that are not shaded are not necessarily perfect, only outside the top ten.
          </p>
          {keys.length === 0 ? <p className={styles.emptyNote}>No key-level data recorded yet.</p> : <KeyboardHeat keys={keys} />}
          {pairs.length > 0 && (
            <div className={styles.pairs}>
              <h3>Frequent slips between two keys</h3>
              <ul>
                {pairs.map((slip) => (
                  <li key={slip.pair}>
                    <code aria-hidden="true">{visiblePair(slip.pair)}</code>
                    <span className={styles.srOnly}>{spokenPair(slip.pair)}, </span>
                    <span>{slip.count}×</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
      <div className={styles.grid}>
        <section className={styles.card}>
          <h2>Mastery growth</h2>
          <p className={styles.caption}>Score after each practice update, per skill. The line starts at the score before the first update.</p>
          {growth.length === 0 ? <p className={styles.emptyNote}>No mastery updates recorded yet.</p> : (
            <ul className={styles.growthList}>
              {growth.map((entry) => (
                <li key={entry.skillId}>
                  <span className={styles.growthName}>{skillName(entry.skillId)}<small>{entry.updates === 1 ? 'assessed once' : `${entry.updates} assessments`}</small></span>
                  {entry.updates > 1 ? (
                    <Sparkline
                      values={entry.scores}
                      width={120}
                      height={30}
                      tone={entry.change > 0 ? 'success' : entry.change < 0 ? 'danger' : 'muted'}
                      label={`${skillName(entry.skillId)} mastery from ${Math.round(entry.first)} to ${Math.round(entry.latest)} over ${entry.updates} assessments`}
                    />
                  ) : <span className={styles.growthNote}>Needs a second session to show a trend</span>}
                  <strong className={entry.change > 0 ? styles.up : entry.change < 0 ? styles.down : undefined}>
                    {Math.round(entry.latest)}%
                    {entry.updates > 1 && <small>{entry.change > 0 ? '+' : ''}{Math.round(entry.change)}</small>}
                  </strong>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className={styles.card}>
          <h2>Skill levels</h2>
          <p className={styles.caption}>
            Each skill has a level and a score out of 100. The score blends accuracy (70 points) and speed (30 points, full marks at 40 WPM). Strong needs 20 WPM and mastered needs 30 WPM, however high the score. {mastered} mastered · {weak} need reinforcement.
          </p>
          <div className={styles.masteryList}>{TYPING_SKILLS.map((skill) => {
            const item = mastery.find((entry) => entry.skill_id === skill.id);
            const score = Math.round(item?.mastery_score || 0);
            return <div className={styles.masteryRow} key={skill.id}><span>{skill.name}<small>{item ? `${item.practice_count} session${item.practice_count === 1 ? '' : 's'} · score ${score} of 100` : 'Not started'}</small></span><strong>{item ? masteryLevelName(item.mastery_level) : '—'}</strong><div className={styles.track}><i style={{ width: `${score}%` }} /></div></div>;
          })}</div>
        </section>
      </div>
    </div>
  );
}
