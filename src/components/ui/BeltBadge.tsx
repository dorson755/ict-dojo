import styles from './BeltBadge.module.css';

const BELT_COLORS = [
  'white', 'yellow', 'orange', 'green',
  'blue', 'purple', 'brown', 'black',
] as const;

const BELT_NAMES = [
  'White', 'Yellow', 'Orange', 'Green',
  'Blue', 'Purple', 'Brown', 'Black',
] as const;

export function getBeltFromLevel(level: number): number {
  // Every 5 levels = 1 belt. Level 1-5 = White, 6-10 = Yellow, etc.
  return Math.min(7, Math.floor((level - 1) / 5));
}

export function getBeltName(belt: number): string {
  return BELT_NAMES[belt] ?? 'White';
}

export function getBeltColor(belt: number): string {
  return `var(--belt-${BELT_COLORS[belt] ?? 'white'})`;
}

interface BeltBadgeProps {
  belt: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function BeltBadge({ belt, size = 'md' }: BeltBadgeProps) {
  const color = getBeltColor(belt);
  const name = getBeltName(belt);

  return (
    <div className={`${styles.badge} ${styles[size]}`}>
      <span
        className={styles.strip}
        style={{ background: color }}
        aria-hidden
      />
      <span className={styles.label}>{name} Belt</span>
    </div>
  );
}
