import { getBeltColor } from '@/components/ui/BeltBadge';
import { getBeltName } from '@/domains/shared/belt-names';
import styles from './belt-promotion.module.css';

interface BeltPromotionProps {
  fromBelt: number;
  toBelt: number;
}

/** The old belt color is wiped over by the new one, then a single shimmer passes. Plays once. */
export default function BeltPromotion({ fromBelt, toBelt }: BeltPromotionProps) {
  return (
    <div className={styles.stage} role="img" aria-label={`${getBeltName(fromBelt)} belt changes to ${getBeltName(toBelt)} belt`}>
      <div
        className={styles.strip}
        style={{ '--from': getBeltColor(fromBelt), '--to': getBeltColor(toBelt) } as React.CSSProperties}
      >
        <span className={styles.seam} aria-hidden />
      </div>
    </div>
  );
}
