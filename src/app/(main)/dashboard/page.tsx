import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUserSession } from '@/lib/firebase/auth-utils';
import { UserRepository } from '@/lib/firebase/repositories/user.repository';
import { RecommendationRepository } from '@/lib/firebase/repositories/recommendation.repository';
import { MasteryRepository, type SkillMastery } from '@/lib/firebase/repositories/mastery.repository';
import { ExerciseRepository } from '@/lib/firebase/repositories/exercise.repository';
import BeltBadge, { getBeltFromLevel } from '@/components/ui/BeltBadge';
import SkillBar from '@/components/ui/SkillBar';
import styles from './dashboard.module.css';

interface SessionRecord {
  created_at?: string;
  wpm?: number;
  accuracy?: number;
}

export default async function DashboardPage() {
  const user = await getUserSession();

  if (!user) {
    redirect('/login');
  }

  const profile = await UserRepository.getProfile(user.id);

  if (!profile || !profile.grade_level) {
    redirect('/onboarding');
  }

  const [dna, activeRec, masteredSkills, recentSessions] = await Promise.all([
    UserRepository.getTypingDNA(user.id).catch(() => null),
    RecommendationRepository.getActiveRecommendation(user.id).catch(() => null),
    MasteryRepository.getTopMasteredSkills(user.id, 5).catch(() => []),
    ExerciseRepository.getRecentSessions(user.id, 5).catch(() => []),
  ]);

  const level = profile.platform_level || 1;
  const xp = profile.xp_total || 0;
  const belt = getBeltFromLevel(level);
  const streak = profile.streak_count || 0;
  const xpInLevel = xp % 1000;
  const xpPercent = Math.round((xpInLevel / 1000) * 100);

  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.heroIdentity}>
            <div className={styles.levelCircle}>{level}</div>
            <div className={styles.heroLevel}>
              <BeltBadge belt={belt} size="md" />
              <span className={styles.heroLevelLabel}>Level {level}</span>
            </div>
          </div>
          <div className={styles.xpBarWrap}>
            <div className={styles.xpBar}>
              <div className={styles.xpFill} style={{ width: `${xpPercent}%` }} />
            </div>
            <div className={styles.xpLabel}>
              <span>{xpInLevel} XP</span>
              <span>1000 XP</span>
            </div>
          </div>
        </div>

        <hr className={styles.heroDivider} />

        <div className={styles.heroSection}>
          <p className={styles.heroSectionLabel}>Next challenge</p>
          {activeRec ? (
            <div className={styles.nextChallenge}>
              <h3 className={styles.nextChallengeTitle}>
                {activeRec.skills?.name || 'Targeted practice'}
              </h3>
              <p className={styles.nextChallengeReason}>{activeRec.reason}</p>
              <Link href="/practice" className="btn btn-primary btn-lg">
                Start practice
              </Link>
            </div>
          ) : (
            <div className={styles.allCaughtUp}>
              <p>You&apos;re all caught up. Keep training to push your limits.</p>
              <Link href="/practice" className="btn btn-primary">
                Enter the dojo
              </Link>
            </div>
          )}
        </div>
      </section>

      <div className={styles.grid}>
        {/* Main column */}
        <div>
          {/* Skill Mastery */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Skill mastery</h2>
            <div className={styles.skillList}>
              {masteredSkills && masteredSkills.length > 0 ? (
                masteredSkills.map((sm: SkillMastery, i: number) => (
                  <SkillBar
                    key={i}
                    name={sm.skills?.name || 'Skill'}
                    score={sm.mastery_score}
                    level={sm.mastery_level}
                  />
                ))
              ) : (
                <p className={styles.emptyState}>
                  No skills tracked yet. Complete a practice session to see your mastery here.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className={styles.sidebar}>
          {/* Streak + Typing DNA */}
          <div className={styles.sideCard}>
            <div className={styles.streakRow}>
              <div>
                <div className={styles.bigStat}>{streak}</div>
                <p className={styles.statSub}>Day streak</p>
              </div>
              <div>
                <div className={styles.bigStat}>
                  {dna?.baseline_wpm ?? dna?.avg_wpm ?? '--'}
                </div>
                <p className={styles.statSub}>Baseline WPM</p>
              </div>
            </div>
            {dna?.last_assessed_at && (
              <p className={styles.statSubGap}>
                Last assessed {new Date(dna.last_assessed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </p>
            )}
          </div>

          {/* Weaknesses */}
          <div className={styles.sideCard}>
            <h3 className={styles.sideCardTitle}>Weak keys</h3>
            {dna?.weak_keys && Object.keys(dna.weak_keys).length > 0 ? (
              <div className={styles.weakKeys}>
                {Object.entries(dna.weak_keys)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([key]) => (
                    <span key={key} className={styles.weakKey}>
                      {key === ' ' ? 'SP' : key.toUpperCase()}
                    </span>
                  ))}
              </div>
            ) : (
              <p className={styles.emptyState}>No weaknesses detected yet.</p>
            )}
          </div>

          {/* Recent Sessions */}
          <div className={styles.sideCard}>
            <h3 className={styles.sideCardTitle}>Recent sessions</h3>
            {recentSessions.length > 0 ? (
              <div className={styles.sessionList}>
                {recentSessions.map((session: SessionRecord, i: number) => (
                  <div key={i} className={styles.sessionItem}>
                    <span className={styles.sessionDate}>
                      {session.created_at
                        ? new Date(session.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                        : '—'}
                    </span>
                    <div className={styles.sessionStats}>
                      <span className={styles.wpmStat}>{session.wpm ?? 0} WPM</span>
                      <span className={styles.accStat}>{session.accuracy ?? 0}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.emptyState}>No sessions yet.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
