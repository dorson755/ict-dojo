import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/aws/auth-utils';
import { UserRepository } from '@/lib/aws/repositories/user.repository';
import FallingWordsClient from './FallingWordsClient';
import { topWeakChars } from '@/domains/typing/word-bank';
import styles from '../games.module.css';

export default async function FallingWordsPage() {
  const user = await getUserSession();
  if (!user) redirect('/login');
  if (user.role === 'teacher') redirect('/teacher');
  if (user.role === 'parent') redirect('/parent');

  const dna = await UserRepository.getTypingDNA(user.id).catch(() => null);
  const weakKeys = dna?.weak_keys ?? {};
  const weakChars = topWeakChars(weakKeys, 5);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Games / falling words</p>
        <h1 className={styles.title}>Falling Words</h1>
        <p className={styles.subtitle}>
          {weakChars.length > 0
            ? `Words are picked to feature the keys you miss most: ${weakChars.join(' ')}.`
            : 'Words fall from the sky. Clear them before they land.'}
        </p>
      </header>
      <FallingWordsClient studentId={user.id} weakKeys={weakKeys} />
    </div>
  );
}
