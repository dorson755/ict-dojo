import { areaPath, linePath, linearScale, niceCeiling, round, ticks } from './geometry';
import styles from './charts.module.css';

export interface LineChartPoint {
  /** Axis label, already formatted (e.g. "10/7"). */
  label: string;
  value: number;
  /** Optional second series on a fixed 0-100 scale, such as accuracy. */
  secondary?: number;
  /** Extra detail used only in the text alternative. */
  detail?: string;
}

interface LineChartProps {
  points: LineChartPoint[];
  /** Describes what is plotted, e.g. "Words per minute". */
  title: string;
  unit?: string;
  secondaryName?: string;
  /** Draws a dashed reference line, e.g. the personal best. */
  referenceValue?: number;
  referenceLabel?: string;
}

const W = 640;
const H = 240;
const M = { top: 16, right: 44, bottom: 30, left: 40 };

export function LineChart({ points, title, unit = '', secondaryName = 'Accuracy', referenceValue, referenceLabel }: LineChartProps) {
  if (!points.length) return <p className={styles.chartEmpty}>No sessions to chart yet.</p>;

  const ceiling = niceCeiling(Math.max(...points.map((point) => point.value), referenceValue ?? 0));
  const x = linearScale([0, Math.max(points.length - 1, 1)], [M.left, W - M.right]);
  const y = linearScale([0, ceiling], [H - M.bottom, M.top]);
  const yPct = linearScale([0, 100], [H - M.bottom, M.top]);

  const px = (index: number) => (points.length === 1 ? (M.left + W - M.right) / 2 : x(index));
  const main = points.map((point, index) => ({ x: px(index), y: y(point.value) }));
  const secondaryPoints = points
    .map((point, index) => (point.secondary === undefined ? null : { x: px(index), y: yPct(point.secondary) }))
    .filter((point): point is { x: number; y: number } => point !== null);

  const labelEvery = Math.max(1, Math.ceil(points.length / 8));
  const summary = `${title}: ${points
    .map((point) => `${point.label} ${point.value}${unit}${point.detail ? ` (${point.detail})` : ''}`)
    .join(', ')}.`;

  return (
    <figure className={styles.figure}>
      <div className={styles.scroller} tabIndex={0} role="group" aria-label={`${title} chart, scrollable`}>
      <svg className={styles.lineChart} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary}>
        {ticks(ceiling, 4).map((tick) => (
          <g key={tick}>
            <line className={styles.grid} x1={M.left} x2={W - M.right} y1={y(tick)} y2={y(tick)} />
            <text className={styles.axisText} x={M.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle">{tick}</text>
          </g>
        ))}
        {secondaryPoints.length > 0 && [0, 50, 100].map((tick) => (
          <text key={`p${tick}`} className={styles.axisText} x={W - M.right + 8} y={yPct(tick)} dominantBaseline="middle">{tick}%</text>
        ))}

        {referenceValue !== undefined && referenceValue > 0 && (
          <g>
            <line className={styles.reference} x1={M.left} x2={W - M.right} y1={y(referenceValue)} y2={y(referenceValue)} />
            <text className={styles.referenceText} x={M.left + 4} y={y(referenceValue) - 5}>{referenceLabel ?? `Best ${referenceValue}`}</text>
          </g>
        )}

        {secondaryPoints.length > 1 && <path className={styles.secondaryLine} d={linePath(secondaryPoints)} />}
        {main.length > 1 && <path className={styles.area} d={areaPath(main, H - M.bottom)} />}
        {main.length > 1 && <path className={styles.primaryLine} d={linePath(main)} />}
        {main.map((point, index) => (
          <circle key={index} className={index === main.length - 1 ? styles.dotLatest : styles.dot} cx={round(point.x)} cy={round(point.y)} r={index === main.length - 1 ? 4.5 : 3}>
            <title>{`${points[index].label}: ${points[index].value}${unit}${points[index].detail ? `, ${points[index].detail}` : ''}`}</title>
          </circle>
        ))}

        {points.map((point, index) => (index % labelEvery === 0 || index === points.length - 1) && (
          <text key={`x${index}`} className={styles.axisText} x={round(px(index))} y={H - 10} textAnchor="middle">{point.label}</text>
        ))}
      </svg>
      </div>
      <figcaption className={styles.legend}>
        <span><i className={styles.keyPrimary} /> {title}</span>
        {secondaryPoints.length > 0 && <span><i className={styles.keySecondary} /> {secondaryName} (right axis)</span>}
        {referenceValue !== undefined && referenceValue > 0 && <span><i className={styles.keyReference} /> {referenceLabel ?? 'Reference'}</span>}
      </figcaption>
    </figure>
  );
}
