import { linearScale, niceCeiling, round } from './geometry';
import styles from './charts.module.css';

export interface BarDatum {
  label: string;
  value: number;
  /** Shown in the text alternative and the hover title. */
  detail?: string;
  tone?: 'accent' | 'success' | 'warning' | 'danger' | 'muted';
}

interface BarChartProps {
  data: BarDatum[];
  title: string;
  unit?: string;
  height?: number;
  /** Show a label under every Nth bar to avoid crowding. */
  labelEvery?: number;
}

const W = 640;
const M = { top: 12, right: 8, bottom: 28, left: 32 };

export function BarChart({ data, title, unit = '', height = 180, labelEvery = 1 }: BarChartProps) {
  if (!data.length) return <p className={styles.chartEmpty}>Nothing to show yet.</p>;

  const ceiling = niceCeiling(Math.max(...data.map((datum) => datum.value), 1), 4);
  const y = linearScale([0, ceiling], [height - M.bottom, M.top]);
  const slot = (W - M.left - M.right) / data.length;
  const barWidth = Math.min(slot * 0.62, 44);
  const summary = `${title}: ${data.map((datum) => `${datum.label} ${datum.value}${unit}${datum.detail ? ` (${datum.detail})` : ''}`).join(', ')}.`;
  const gridTicks = [0, ceiling / 2, ceiling];

  return (
    <svg className={styles.barChart} viewBox={`0 0 ${W} ${height}`} role="img" aria-label={summary}>
      {gridTicks.map((tick) => (
        <g key={tick}>
          <line className={styles.grid} x1={M.left} x2={W - M.right} y1={y(tick)} y2={y(tick)} />
          <text className={styles.axisText} x={M.left - 6} y={y(tick)} textAnchor="end" dominantBaseline="middle">{round(tick)}</text>
        </g>
      ))}
      {data.map((datum, index) => {
        const cx = M.left + slot * index + slot / 2;
        const top = y(datum.value);
        const barHeight = Math.max(datum.value > 0 ? 2 : 0, height - M.bottom - top);
        return (
          <g key={`${datum.label}-${index}`}>
            <rect
              className={`${styles.bar} ${styles[`bar-${datum.tone ?? 'accent'}`]}`}
              x={round(cx - barWidth / 2)}
              y={round(height - M.bottom - barHeight)}
              width={round(barWidth)}
              height={round(barHeight)}
              rx={2}
            >
              <title>{`${datum.label}: ${datum.value}${unit}${datum.detail ? `, ${datum.detail}` : ''}`}</title>
            </rect>
            {index % labelEvery === 0 && (
              <text className={styles.axisText} x={round(cx)} y={height - 10} textAnchor="middle">{datum.label}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
