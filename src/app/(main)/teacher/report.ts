import { UserRepository } from '@/lib/aws/repositories/user.repository';
import { MasteryRepository } from '@/lib/aws/repositories/mastery.repository';
import { ExerciseRepository } from '@/lib/aws/repositories/exercise.repository';

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
    const averageMastery = mastery.length ? Math.round(mastery.reduce((sum, item) => sum + item.mastery_score, 0) / mastery.length) : 0;
    const hasStarted = sessions.length > 0 || mastery.some((item) => item.practice_count > 0);
    const lastPractice = sessions[0]?.created_at ? new Date(String(sessions[0].created_at)) : null;
    const daysSincePractice = lastPractice ? Math.floor((now - lastPractice.getTime()) / 86_400_000) : null;
    const weakSkills = mastery.filter((item) => item.mastery_level === 'weak').length;
    const sessionsThisWeek = recent.length;
    const reason = daysSincePractice === null ? 'No practice recorded' : daysSincePractice > 7 ? 'Inactive for over a week' : weakSkills ? `${weakSkills} skill${weakSkills === 1 ? '' : 's'} need reinforcement` : 'On track';
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
      reason,
      needsAttention: reason !== 'On track',
    };
  }));
}
