import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/aws/auth-utils';
import { UserRepository } from '@/lib/aws/repositories/user.repository';
import { MasteryRepository } from '@/lib/aws/repositories/mastery.repository';
import styles from './profile.module.css';
import ProfileForm from './ProfileForm';

export default async function ProfilePage() {
  const user = await getUserSession();
  if (!user) redirect('/login');
  if (user.role !== 'student') redirect('/dashboard');
  const [profile, dna, mastery] = await Promise.all([
    UserRepository.getProfile(user.id),
    UserRepository.getTypingDNA(user.id).catch(() => null),
    MasteryRepository.getAllMastery(user.id).catch(() => []),
  ]);
  if (!profile) redirect('/onboarding');

  const trophies = [
    { name: 'First milestone', description: 'Reach platform level 2.', icon: '✦', earned: (profile.platform_level ?? 1) >= 2 },
    { name: 'Precision adept', description: 'Build a 95% average accuracy.', icon: '◎', earned: (dna?.avg_accuracy ?? 0) >= 95 },
    { name: 'Seven-day discipline', description: 'Maintain a 7-day practice streak.', icon: '◈', earned: (profile.streak_count ?? 0) >= 7 },
    { name: 'Skill builder', description: 'Master three skills.', icon: '◆', earned: mastery.filter((item) => item.mastery_level === 'mastered').length >= 3 },
    { name: 'Dedicated learner', description: 'Complete 10 analyzed sessions.', icon: '★', earned: (dna?.sessions_analyzed ?? 0) >= 10 },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.avatar}>{(profile.display_name || user.name || 'S').slice(0, 1).toUpperCase()}</div>
        <div><h1 className={styles.title}>{profile.display_name || user.name || 'Learner'}</h1><p className={styles.subtitle}>Your dojo identity and achievements</p></div>
      </header>
      <div className={styles.grid}>
        <section className={styles.card}><h2 className={styles.cardTitle}>Edit profile</h2><ProfileForm displayName={profile.display_name || user.name || ''} gradeLevel={profile.grade_level ?? 6} /></section>
        <section className={styles.card}><h2 className={styles.cardTitle}>Trophy collection</h2><div className={styles.trophies}>{trophies.map((trophy) => <div className={`${styles.trophy} ${trophy.earned ? styles.earned : styles.locked}`} key={trophy.name}><span className={styles.trophyIcon}>{trophy.icon}</span><div><strong>{trophy.name}</strong><p>{trophy.description}</p></div></div>)}</div></section>
      </div>
    </div>
  );
}
