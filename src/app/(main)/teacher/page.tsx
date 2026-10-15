import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/aws/auth-utils';
import Link from 'next/link';
import { getTeacherReport } from './report';
import { STATUS_LABEL, STATUS_PRIORITY, type LearnerStatus } from './learner-status';
import { activityWindow, classSeries, shortDay, summarizeWpm, wpmDistribution } from './progress';
import { LineChart } from '@/components/charts/LineChart';
import { BarChart } from '@/components/charts/BarChart';
import { Sparkline } from '@/components/charts/Sparkline';
import styles from './teacher.module.css';

const BADGE_CLASS: Record<LearnerStatus, string> = {
  needs_reinforcement: styles.attentionBadge,
  inactive: styles.inactiveBadge,
  on_track: styles.healthyBadge,
  not_started: styles.notStartedBadge,
};

const SEGMENT_CLASS: Record<LearnerStatus, string> = {
  needs_reinforcement: styles.segDanger,
  inactive: styles.segWarning,
  on_track: styles.segSuccess,
  not_started: styles.segMuted,
};

const SEGMENT_ORDER: LearnerStatus[] = ['needs_reinforcement', 'inactive', 'on_track', 'not_started'];
const CLASS_TREND_DAYS = 30;
const ACTIVITY_DAYS = 14;

function trendTone(direction: ReturnType<typeof summarizeWpm>['direction']) {
  if (direction === 'up') return 'success' as const;
  if (direction === 'down') return 'danger' as const;
  return 'muted' as const;
}

function trendText(summary: ReturnType<typeof summarizeWpm>) {
  if (summary.direction === 'none') return 'No sessions';
  if (summary.direction === 'flat') return 'Holding steady';
  const sign = summary.change > 0 ? '+' : '';
  return `${sign}${summary.change} WPM`;
}

export default async function TeacherDashboardPage() {
  const user = await getUserSession();
  if (!user) redirect('/login');
  if (user.role !== 'teacher' && user.role !== 'admin') redirect('/dashboard');

  const students = await getTeacherReport(user.id);
  const started = students.filter((student) => student.hasStarted);
  const needsAttention = students.filter((student) => student.needsAttention);
  const activeThisWeek = students.filter((student) => student.sessionsThisWeek > 0).length;

  const combined = classSeries(students.map((student) => student.wpmSeries)).slice(-CLASS_TREND_DAYS);
  const withTrend = students.filter((student) => student.wpmSummary.direction !== 'none' && student.wpmSummary.points >= 2);
  const improvers = {
    total: withTrend.length,
    up: withTrend.filter((student) => student.wpmSummary.direction === 'up').length,
    down: withTrend.filter((student) => student.wpmSummary.direction === 'down').length,
  };
  const classPoints = combined.map((point) => ({
    label: shortDay(point.day),
    value: point.wpm,
    secondary: point.accuracy || undefined,
    detail: `${point.sessions} session${point.sessions === 1 ? '' : 's'}`,
  }));

  const activity = activityWindow(students.map((student) => student.sessions), ACTIVITY_DAYS);
  const activityTotal = activity.reduce((sum, day) => sum + day.sessions, 0);
  const activityData = activity.map((day) => ({
    label: shortDay(day.day),
    value: day.sessions,
    detail: `${day.learners} learner${day.learners === 1 ? '' : 's'}, ${day.minutes} min`,
  }));

  const latestWpms = started.map((student) => student.wpmSummary.latest).filter((value) => value > 0);
  const distribution = wpmDistribution(latestWpms).map((bucket) => ({ label: bucket.label, value: bucket.count, tone: 'accent' as const }));
  const classBest = Math.max(0, ...started.map((student) => student.wpmSummary.best));
  const medianWpm = latestWpms.length
    ? [...latestWpms].sort((a, b) => a - b)[Math.floor(latestWpms.length / 2)]
    : 0;
  const avgMastery = started.length ? Math.round(started.reduce((sum, student) => sum + student.averageMastery, 0) / started.length) : 0;

  const statusCounts = SEGMENT_ORDER.map((status) => ({
    status,
    count: students.filter((student) => student.status === status).length,
  }));

  const roster = [...students].sort(
    (a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status] || b.wpmSummary.latest - a.wpmSummary.latest || b.averageMastery - a.averageMastery,
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Dojo mentor view</h1>
          <p className={styles.subtitle}>
            Welcome, {user.name || 'Mentor'}. {students.length} learners, {started.length} have started practicing.
          </p>
        </div>
        <Link className="btn btn-secondary" href="/teacher/export">Export CSV</Link>
      </header>

      <section className={styles.overview} aria-label="Class overview">
        <div className={styles.trendPanel}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>Class typing speed</h2>
              <p className={styles.panelSubtitle}>
                Average words per minute across learners, one point per practice day.
              </p>
            </div>
            {improvers.total > 0 && (
              <span className={`${styles.trendChip} ${improvers.up >= improvers.down ? styles['trend-up'] : styles['trend-down']}`}>
                {improvers.up} of {improvers.total} improving
              </span>
            )}
          </div>
          <LineChart
            points={classPoints}
            title="Average WPM on practice days"
            secondaryName="Accuracy"
            referenceValue={classBest}
            referenceLabel={`Class best ${Math.round(classBest)}`}
          />
          <p className={styles.chartNote}>
            Each point averages the learners who practiced that day, so it moves with who showed up. Use the speed trend on each learner below to judge individual progress.
          </p>
        </div>

        <dl className={styles.vitals}>
          <div>
            <dt>Median speed</dt>
            <dd>{medianWpm ? Math.round(medianWpm) : '—'}<small>WPM</small></dd>
          </div>
          <div>
            <dt>Class best</dt>
            <dd>{classBest ? Math.round(classBest) : '—'}<small>WPM</small></dd>
          </div>
          <div>
            <dt>Average mastery</dt>
            <dd>{started.length ? avgMastery : '—'}<small>%</small></dd>
          </div>
          <div>
            <dt>Active this week</dt>
            <dd>{activeThisWeek}<small>of {students.length}</small></dd>
          </div>
          <div>
            <dt>Need attention</dt>
            <dd className={needsAttention.length ? styles.vitalWarn : undefined}>{needsAttention.length}<small>learners</small></dd>
          </div>
        </dl>
      </section>

      <section className={styles.secondary} aria-label="Activity and spread">
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>Daily practice</h2>
              <p className={styles.panelSubtitle}>
                {activityTotal
                  ? `${activityTotal} sessions in the last ${ACTIVITY_DAYS} days.`
                  : `No practice in the last ${ACTIVITY_DAYS} days.`}
              </p>
            </div>
          </div>
          <BarChart data={activityData} title="Sessions per day" labelEvery={2} height={170} />
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>Where learners sit</h2>
              <p className={styles.panelSubtitle}>Each learner&apos;s latest speed, grouped by band.</p>
            </div>
          </div>
          <BarChart data={distribution} title="Learners per WPM band" unit=" learners" height={170} />
        </div>
      </section>

      <section className={styles.panel} aria-label="Learner status">
        <div className={styles.panelHeader}>
          <div>
            <h2 className={styles.panelTitle}>Learner signals</h2>
            <p className={styles.panelSubtitle}>Struggling learners first, then inactive, then everyone on track.</p>
          </div>
        </div>
        <div className={styles.statusBar} role="img" aria-label={statusCounts.map(({ status, count }) => `${count} ${STATUS_LABEL[status].toLowerCase()}`).join(', ')}>
          {statusCounts.filter(({ count }) => count > 0).map(({ status, count }) => (
            <span key={status} className={SEGMENT_CLASS[status]} style={{ flexGrow: count }} title={`${STATUS_LABEL[status]}: ${count}`} />
          ))}
        </div>
        <ul className={styles.statusKey}>
          {statusCounts.map(({ status, count }) => (
            <li key={status}><i className={SEGMENT_CLASS[status]} />{STATUS_LABEL[status]} <strong>{count}</strong></li>
          ))}
        </ul>

        {students.length === 0 ? <p className={styles.emptyText}>Learners will appear here as they complete onboarding.</p> : (
          <div className={styles.learnerList}>
            <div className={styles.listHead} aria-hidden="true">
              <span>Learner</span><span>Speed trend</span><span>Latest</span><span>Mastery</span><span>Accuracy</span><span>Status</span>
            </div>
            {roster.map((student) => {
              const summary = student.wpmSummary;
              const spark = student.wpmSeries.slice(-14).map((point) => point.wpm);
              const sparkLabel = summary.direction === 'none'
                ? `${student.display_name || 'Learner'} has no typing sessions yet`
                : `${student.display_name || 'Learner'} typing speed over ${student.wpmSeries.length} practice days, latest ${summary.latest} WPM, ${trendText(summary)}`;
              return (
                <Link className={styles.learnerLink} href={`/teacher/student/${student.id}`} key={student.id}>
                  <div className={styles.learnerRow}>
                    <div className={styles.learnerIdentity}>
                      <span className={styles.avatar}>{(student.display_name || 'S').slice(0, 1).toUpperCase()}</span>
                      <div>
                        <strong>{student.display_name || 'Unnamed learner'}</strong>
                        <span className={styles.learnerMeta}>Level {student.platform_level} · Grade {student.grade_level || '—'}</span>
                      </div>
                    </div>
                    <div className={styles.sparkCell}>
                      <Sparkline values={spark} label={sparkLabel} tone={trendTone(summary.direction)} />
                      <span className={`${styles.trendText} ${styles[`trend-${summary.direction}`]}`}>{summary.direction === 'none' ? '' : trendText(summary)}</span>
                    </div>
                    <div className={`${styles.learnerMetric} ${styles.metricLatest}`}>
                      <strong>{summary.latest ? Math.round(summary.latest) : '—'}</strong>
                      <span>{summary.best ? `WPM · best ${Math.round(summary.best)}` : 'WPM'}</span>
                    </div>
                    <div className={`${styles.learnerMetric} ${styles.metricMastery}`}>
                      <strong>{student.hasStarted ? `${student.averageMastery}%` : '—'}</strong>
                      {student.hasStarted && <i className={styles.meter}><b style={{ width: `${student.averageMastery}%` }} /></i>}
                    </div>
                    <div className={`${styles.learnerMetric} ${styles.metricAccuracy}`}>
                      <strong>{student.overallAccuracy ? `${student.overallAccuracy}%` : '—'}</strong>
                      <span>{student.sessionCount ? `${student.sessionCount} session${student.sessionCount === 1 ? '' : 's'}` : 'no sessions'}</span>
                    </div>
                    <span className={BADGE_CLASS[student.status]} title={student.reason}>{STATUS_LABEL[student.status]}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
