import { getBeltColor } from '@/components/ui/BeltBadge';
import { getBeltName } from '@/domains/shared/belt-names';
import styles from './auth.module.css';

const BELTS = [0, 1, 2, 3, 4, 5, 6, 7];

/** The eight belts, White to Black. Each slides in once, in order. */
export default function BeltRack() {
  return (
    <aside className={styles.intro}>
      <h1 className={styles.introTitle}>Eight belts. One skill at a time.</h1>
      <p className={styles.introText}>
        Practice typing, documents and code. Earn each belt with real skill, not just time.
      </p>
      <ol className={styles.rack} aria-label="The eight belts, from White to Black">
        {BELTS.map((belt) => (
          <li
            key={belt}
            className={`${styles.rackItem} ${belt === 0 ? styles.rackStart : ''}`}
            style={{ '--i': belt, '--c': getBeltColor(belt) } as React.CSSProperties}
          >
            <span className={`${styles.rackStrip} ${belt === 7 ? styles.rackStripDark : ''}`} aria-hidden />
            <span className={styles.rackName}>{getBeltName(belt)}</span>
          </li>
        ))}
      </ol>
      <p className={styles.introCaption}>Every learner starts at White. The ringed belt is where you begin.</p>
    </aside>
  );
}
