import { UserRepository } from '@/lib/aws/repositories/user.repository';
import { MasteryRepository } from '@/lib/aws/repositories/mastery.repository';
import { ExerciseRepository } from '@/lib/aws/repositories/exercise.repository';
import { TYPING_SKILLS } from '@/domains/typing/catalog';
import { averageCatalogMastery, classifyLearner, countWeakSkills } from './learner-status';

const CATALOG_SKILL_IDS: ReadonlySet<string> = new Set(TYPING_SKILLS.map((skill) => skill.id));

export async function getTeacherReport(teacherId: string) {
  const profiles = await UserRepository.getStudentProfiles(teacherId);
  const now = new Date().getTime();
  return Promise.all(profiles.map(async (student) => {
    const [mastery, sessions] = await Promise.all([
      MasteryRepository.getAllMastery(student.id).catch(() => []),
      ExerciseRepository.getRecentSessions(student.id, 50).catch(() => []),
    ]);
    const recent = sessions.filter((session) => now - new Date(String(session.created_at)).getTime() <= 7 * 86_400_000);
    const average = (items: typeof recent, key: 'wpm' | 'accuracy') => {
      const values = items.map((item) => Number(item[key])).filter((value) => Number.isFinite(value) && value > 0);
      return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
    };
    const recentHalf = sessions.slice(0, 3);
    const previousHalf = sessions.slice(3, 6);
    const averageMastery = averageCatalogMastery(mastery, CATALOG_SKILL_IDS);
    const hasStarted = sessions.length > 0 || mastery.some((item) => item.practice_count > 0);
    const lastPractice = sessions[0]?.created_at ? new Date(String(sessions[0].created_at)) : null;
    const daysSincePractice = lastPractice ? Math.floor((now - lastPractice.getTime()) / 86_400_000) : null;
    const weakSkills = countWeakSkills(mastery, CATALOG_SKILL_IDS);
    const sessionsThisWeek = recent.length;
    const { status, reason } = classifyLearner({ hasStarted, daysSincePractice, weakSkills });
    return {
      ...student,
      hasStarted,
      averageMastery,
      weakSkills,
      sessionsThisWeek,
      minutesThisWeek: Math.round(recent.reduce((sum, item) => sum + (Number(item.durationMs) || 0), 0) / 60000),
      averageWpm: average(recent, 'wpm'),
      averageAccuracy: average(recent, 'accuracy'),
      wpmTrend: average(recentHalf, 'wpm') - average(previousHalf, 'wpm'),
      accuracyTrend: average(recentHalf, 'accuracy') - average(previousHalf, 'accuracy'),
      lastPractice,
      daysSincePractice,
      status,
      reason,
      needsAttention: status === 'needs_reinforcement' || status === 'inactive',
    };
  }));
}
