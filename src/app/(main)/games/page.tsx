import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/aws/auth-utils';
import { UserRepository } from '@/lib/aws/repositories/user.repository';
import { topWeakChars } from '@/domains/typing/word-bank';
import styles from './games.module.css';

export default async function GamesPage() {
  const user = await getUserSession();
  if (!user) redirect('/login');
  if (user.role === 'teacher') redirect('/teacher');
  if (user.role === 'parent') redirect('/parent');

  const dna = await UserRepository.getTypingDNA(user.id).catch(() => null);
  const weakChars = topWeakChars(dna?.weak_keys ?? {}, 5);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Games</p>
        <h1 className={styles.title}>The arcade</h1>
        <p className={styles.subtitle}>
          Every game logs a real session: XP, streaks, personal records and skill
          mastery all count, just like practice.
        </p>
      </header>

      <div className={styles.grid}>
        <Link href="/games/dojo-quest" className={styles.card}>
          <h2>Dojo Quest</h2>
          <p>Type to defend a pixel-art world. Return to four settings with harder words at each belt, then face the guardian&apos;s scroll.</p>
          <span className={styles.meta}>Eight belt-locked stages · AI-targeted words</span>
        </Link>
        <Link href="/games/dojo-defense" className={styles.card}>
          <h2>Dojo Defense</h2>
          <p>Two cats hold the street against five waves and a boss. Clean words earn team attacks and shields.</p>
          <span className={styles.meta}>Words matched to your belt · AI-targeted words</span>
        </Link>
        <Link href="/games/falling-words" className={styles.card}>
          <h2>Falling Words</h2>
          {weakChars.length > 0 ? (
            <div className={styles.chips}>
              {weakChars.map((char) => (
                <span key={char} className={styles.chip}>{char}</span>
              ))}
            </div>
          ) : null}
          <p>Words drop from the sky, built from the keys you miss most. Type them before they land.</p>
          <span className={styles.meta}>Weak-key practice</span>
        </Link>

        <Link href="/games/ghost-race" className={styles.card}>
          <h2>Ghost Race</h2>
          <p>Type a passage against a ghost pacing at your all-time best speed. Beat yourself.</p>
          <span className={styles.meta}>Race your record</span>
        </Link>

        <Link href="/practice/survival" className={styles.card}>
          <h2>Survival</h2>
          <p>Keep your speed above a bar that rises every 30 seconds. Class leaderboards for both modes.</p>
          <span className={styles.meta}>Leaderboards</span>
        </Link>
      </div>
    </div>
  );
}
