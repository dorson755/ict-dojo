import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUserSession } from '@/lib/aws/auth-utils';
import { UserRepository } from '@/lib/aws/repositories/user.repository';
import { RecommendationRepository } from '@/lib/aws/repositories/recommendation.repository';
import { MasteryRepository } from '@/lib/aws/repositories/mastery.repository';
import { ExerciseRepository } from '@/lib/aws/repositories/exercise.repository';
import { ProgressRepository } from '@/lib/aws/repositories/progress.repository';
import BeltBadge, { getBeltFromLevel } from '@/components/ui/BeltBadge';
import SkillTrackCard from '@/components/ui/SkillTrackCard';
import AIGreeting from './AIGreeting';
import styles from './dashboard.module.css';
import { TYPING_SKILLS } from '@/domains/typing/catalog';
import { TYPING_DEPENDENCIES } from '@/domains/typing/catalog';
import { SkillGraph } from '@/domains/shared/skill-graph';
import type { MasteryLevel, SkillMastery as PlatformSkillMastery } from '@/types/platform';

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

  const [dna, activeRec, allMasteries, recentSessions, dailyQuest, weeklyQuest, records] = await Promise.all([
    UserRepository.getTypingDNA(user.id).catch(() => null),
    RecommendationRepository.getActiveRecommendation(user.id).catch(() => null),
    MasteryRepository.getAllMastery(user.id).catch(() => []),
    ExerciseRepository.getRecentSessions(user.id, 5).catch(() => []),
    ProgressRepository.getTodaysQuest(user.id).catch(() => null),
    ProgressRepository.getCurrentWeeklyQuest(user.id).catch(() => null),
    ProgressRepository.getPersonalRecords(user.id).catch(() => []),
  ]);

  const level = profile.platform_level || 1;
  const xp = profile.xp_total || 0;
  const belt = getBeltFromLevel(level);
  const streak = profile.streak_count || 0;
  const xpInLevel = xp % 1000;
  const xpPercent = Math.round((xpInLevel / 1000) * 100);
  const masteryMap = new Map<string, PlatformSkillMastery>(allMasteries.map((mastery) => [
    mastery.skill_id,
    {
      id: mastery.skill_id,
      student_id: mastery.student_id,
      skill_id: mastery.skill_id,
      mastery_score: mastery.mastery_score,
      mastery_level: mastery.mastery_level as MasteryLevel,
      practice_count: mastery.practice_count,
      last_practiced_at: mastery.last_practiced_at ?? null,
      updated_at: '',
    },
  ]));
  const skillGraph = new SkillGraph(TYPING_SKILLS, TYPING_DEPENDENCIES);
  const focusKeys = Object.entries(dna?.weak_keys ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key]) => key === ' ' ? 'space' : key.toUpperCase());
  const dnaAccuracy = Math.round(dna?.avg_accuracy ?? 0);
  const dnaConsistency = Math.min(100, ((dna?.sessions_analyzed ?? 0) * 5) + (streak * 5));

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
          <Suspense fallback={<div className={styles.aiGreeting}><p className={styles.greetingText}>Loading Sensei&apos;s greeting...</p></div>}>
            <AIGreeting 
              name={profile.display_name || user.name || 'Learner'} 
              weakKeys={dna?.weak_keys ? Object.keys(dna.weak_keys).sort((a,b) => (dna.weak_keys as Record<string, number>)[b] - (dna.weak_keys as Record<string, number>)[a]).slice(0, 3) : []}
              streak={profile.streak_count || 0}
            />
          </Suspense>
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
          {/* Skill Tracks Catalog */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Skill tracks</h2>
            <div className={styles.skillGrid}>
              {TYPING_SKILLS.map((skill) => {
                const mastery = masteryMap.get(skill.id);
                const metadata = skill.metadata as { icon?: string };
                return (
                  <SkillTrackCard
                    key={skill.id}
                    skillId={skill.id}
                    name={skill.name}
                    description={skill.description ?? ''}
                    icon={metadata.icon ?? '⌨'}
                    score={mastery?.mastery_score ?? 0}
                    level={mastery?.mastery_level ?? 'not_started'}
                    practiceCount={mastery?.practice_count ?? 0}
                  />
                );
              })}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.pathHeading}>
              <div>
                <h2 className={styles.sectionTitle}>Your skill path</h2>
                <p className={styles.pathSubtitle}>Master each gate to unlock the next challenge.</p>
              </div>
              <span className={styles.pathLegend}>10 skills · Typing</span>
            </div>
            <div className={styles.pathMap}>
              {TYPING_SKILLS.map((skill, index) => {
                const mastery = masteryMap.get(skill.id);
                const isMastered = mastery?.mastery_level === 'mastered';
                const isUnlocked = skillGraph.arePrerequisitesMet(skill.id, masteryMap);
                const status = isMastered ? 'mastered' : !isUnlocked ? 'locked' : mastery?.practice_count ? 'training' : 'ready';
                const metadata = skill.metadata as { icon?: string };
                return (
                  <div key={skill.id} className={`${styles.pathNode} ${styles[`pathNode${status[0].toUpperCase()}${status.slice(1)}`]}`}>
                    <div className={styles.pathNodeTop}>
                      <span className={styles.pathIndex}>{String(index + 1).padStart(2, '0')}</span>
                      <span className={styles.pathIcon}>{status === 'locked' ? '·' : metadata.icon ?? '⌨'}</span>
                    </div>
                    <h3 className={styles.pathName}>{skill.name}</h3>
                    <p className={styles.pathStatus}>
                      {status === 'mastered' ? 'Mastered' : status === 'training' ? `${mastery?.mastery_score ?? 0}% mastery` : status === 'ready' ? 'Ready to train' : 'Locked'}
                    </p>
                    {index < TYPING_SKILLS.length - 1 && <span className={styles.pathConnector} />}
                  </div>
                );
              })}
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

          <div className={styles.sideCard}>
            <h3 className={styles.sideCardTitle}>Your learning DNA</h3>
            <p className={styles.dnaSummary}>
              {dnaAccuracy >= 95 ? 'You are building precise, controlled technique.' : dnaAccuracy >= 85 ? 'Your accuracy is developing steadily.' : 'Your Sensei is prioritizing control before speed.'}
            </p>
            <div className={styles.dnaRows}>
              <div><span>Accuracy pattern</span><strong>{dna?.avg_accuracy ? `${dnaAccuracy}%` : 'Building'}</strong></div>
              <div><span>Current focus</span><strong>{focusKeys.length ? focusKeys.join(' · ') : 'Discovering'}</strong></div>
              <div><span>Consistency</span><strong>{dna?.sessions_analyzed ? `${dnaConsistency}%` : 'New'}</strong></div>
            </div>
          </div>

          <div className={styles.sideCard}>
            <h3 className={styles.sideCardTitle}>Weekly quest</h3>
            {weeklyQuest ? (
              <>
                <p className={styles.questTitle}>{weeklyQuest.title}</p>
                <p className={styles.questDescription}>{weeklyQuest.description}</p>
                <div className={styles.questProgress}><span style={{ width: `${(weeklyQuest.progress / weeklyQuest.target) * 100}%` }} /></div>
                <p className={styles.statSub}>{weeklyQuest.completed ? 'Complete' : `${weeklyQuest.progress} of ${weeklyQuest.target}`} · {weeklyQuest.reward_xp} XP</p>
              </>
            ) : <p className={styles.emptyState}>Complete a session to start this week&apos;s goal.</p>}
          </div>

          <div className={styles.sideCard}>
            <h3 className={styles.sideCardTitle}>Earned badges</h3>
            <div className={styles.badges}>
              {level >= 2 && <span className={styles.badge}>First milestone</span>}
              {(dna?.avg_accuracy ?? 0) >= 95 && <span className={styles.badge}>Precision adept</span>}
              {streak >= 7 && <span className={styles.badge}>Seven-day discipline</span>}
              {allMasteries.filter((mastery) => mastery.mastery_level === 'mastered').length >= 3 && <span className={styles.badge}>Skill builder</span>}
              {level < 2 && (dna?.avg_accuracy ?? 0) < 95 && streak < 7 && <p className={styles.emptyState}>Your next badge is earned through steady practice.</p>}
            </div>
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

          <div className={styles.sideCard}>
            <h3 className={styles.sideCardTitle}>Today&apos;s quest</h3>
            {dailyQuest ? (
              <>
                <p className={styles.questTitle}>{dailyQuest.title}</p>
                <p className={styles.questDescription}>{dailyQuest.description}</p>
                <div className={styles.questProgress}>
                  <span style={{ width: `${(dailyQuest.progress / dailyQuest.target) * 100}%` }} />
                </div>
                <p className={styles.statSub}>
                  {dailyQuest.completed ? 'Complete' : `${dailyQuest.progress} of ${dailyQuest.target}`} · {dailyQuest.reward_xp} XP
                </p>
              </>
            ) : (
              <p className={styles.emptyState}>Complete a practice session to begin today&apos;s quest.</p>
            )}
          </div>

          <div className={styles.sideCard}>
            <h3 className={styles.sideCardTitle}>Personal records</h3>
            {records.length > 0 ? (
              <div className={styles.sessionList}>
                {records.map((record) => (
                  <div key={record.metric} className={styles.sessionItem}>
                    <span className={styles.sessionDate}>
                      {record.metric === 'best_wpm' ? 'Best WPM' : 'Best accuracy'}
                    </span>
                    <span className={styles.wpmStat}>
                      {record.metric === 'best_accuracy' ? `${record.value}%` : `${record.value} WPM`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.emptyState}>Your best sessions will appear here.</p>
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
