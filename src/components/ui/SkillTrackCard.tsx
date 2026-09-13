'use client';

import { useTransition } from 'react';
import { trainSkill } from '@/app/(main)/dashboard/actions';
import styles from './SkillTrackCard.module.css';

interface SkillTrackCardProps {
  skillId: string;
  name: string;
  description: string;
  icon: string;
  score: number;        // 0-100
  level: string;        // 'not_started' | 'weak' | 'developing' | 'strong' | 'mastered'
  practiceCount: number;
}

export default function SkillTrackCard({
  skillId,
  name,
  description,
  icon,
  score,
  level,
  practiceCount,
}: SkillTrackCardProps) {
  const [isPending, startTransition] = useTransition();

  const handleTrain = () => {
    startTransition(async () => {
      await trainSkill(skillId);
    });
  };

  const levelLabel =
    level === 'mastered' ? 'Mastered'
    : level === 'strong' ? 'Strong'
    : level === 'developing' ? 'Developing'
    : level === 'weak' ? 'Weak'
    : 'Not started';

  const levelClass =
    level === 'mastered' ? styles.mastered
    : level === 'strong' ? styles.strong
    : level === 'developing' ? styles.developing
    : level === 'weak' ? styles.weak
    : styles.notStarted;

  return (
    <div className={`${styles.card} ${levelClass}`}>
      <div className={styles.cardTop}>
        <span className={styles.icon}>{icon}</span>
        <div className={styles.meta}>
          <span className={styles.name}>{name}</span>
          <span className={styles.desc}>{description}</span>
        </div>
        <span className={`${styles.levelBadge} ${levelClass}`}>{levelLabel}</span>
      </div>

      <div className={styles.trackRow}>
        <div className={styles.track}>
          <div
            className={`${styles.fill} ${levelClass}`}
            style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
          />
        </div>
        <span className={styles.score}>{Math.round(score)}/100</span>
      </div>

      <div className={styles.footer}>
        <span className={styles.sessions}>
          {practiceCount > 0 ? `${practiceCount} session${practiceCount !== 1 ? 's' : ''}` : 'Never practiced'}
        </span>
        <button
          className={`btn btn-primary ${styles.trainBtn}`}
          onClick={handleTrain}
          disabled={isPending}
        >
          {isPending ? 'Starting…' : 'Train now →'}
        </button>
      </div>
    </div>
  );
}
