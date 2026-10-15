import { areaPath, linePath, linearScale } from './geometry';
import styles from './charts.module.css';

interface SparklineProps {
  values: number[];
  /** Spoken summary for assistive tech; the drawing itself carries no text. */
  label: string;
  width?: number;
  height?: number;
  tone?: 'accent' | 'success' | 'danger' | 'muted';
}

const PAD = 3;

export function Sparkline({ values, label, width = 96, height = 28, tone = 'accent' }: SparklineProps) {
  if (!values.length) {
    return (
      <svg className={styles.sparkline} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} width={width} height={height}>
        <line className={styles.sparkEmpty} x1={PAD} x2={width - PAD} y1={height / 2} y2={height / 2} />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const x = linearScale([0, Math.max(values.length - 1, 1)], [PAD, width - PAD]);
  const y = linearScale([min, max], [height - PAD, PAD]);
  const points = values.map((value, index) => ({ x: values.length === 1 ? width / 2 : x(index), y: y(value) }));
  const last = points[points.length - 1];

  return (
    <svg className={`${styles.sparkline} ${styles[`tone-${tone}`]}`} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} width={width} height={height}>
      {values.length > 1 && <path className={styles.sparkArea} d={areaPath(points, height - PAD)} />}
      {values.length > 1 && <path className={styles.sparkLine} d={linePath(points)} />}
      <circle className={styles.sparkDot} cx={last.x} cy={last.y} r={2.5} />
    </svg>
  );
}
