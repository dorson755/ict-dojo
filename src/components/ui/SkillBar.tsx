import styles from './SkillBar.module.css';

interface SkillBarProps {
  name: string;
  score: number;
  level: string;
}

export default function SkillBar({ name, score, level }: SkillBarProps) {
  const levelClass = level === 'mastered' ? styles.mastered
    : level === 'strong' ? styles.strong
    : level === 'developing' ? styles.developing
    : level === 'weak' ? styles.weak
    : styles.started;

  return (
    <div className={styles.bar}>
      <div className={styles.header}>
        <span className={styles.name}>{name}</span>
        <span className={styles.score}>{Math.round(score)}</span>
      </div>
      <div className={styles.track}>
        <div
          className={`${styles.fill} ${levelClass}`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
    </div>
  );
}
