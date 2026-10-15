import styles from './charts.module.css';

export interface KeyHeat {
  key: string;
  /** 0-1, relative to the learner's own worst key. */
  intensity: number;
}

interface KeyboardHeatProps {
  keys: KeyHeat[];
  title?: string;
}

const ROWS = [
  { keys: 'qwertyuiop', offset: 0.5 },
  { keys: "asdfghjkl;", offset: 0.75 },
  { keys: 'zxcvbnm,./', offset: 1.25 },
];

const UNIT = 34;
const GAP = 4;
const KEY = UNIT - GAP;
const SPACE_WIDTH = UNIT * 6 - GAP;
const WIDTH = UNIT * 11.75;
const HEIGHT = UNIT * 4;

/** Steps keep the scale legible: continuous shading is hard to compare by eye. */
function band(intensity: number): 0 | 1 | 2 | 3 {
  if (intensity >= 0.75) return 3;
  if (intensity >= 0.4) return 2;
  return 1;
}

export function KeyboardHeat({ keys, title = 'Problem keys' }: KeyboardHeatProps) {
  const lookup = new Map(keys.map((entry) => [entry.key.toLowerCase(), entry.intensity]));
  const ranked = [...keys].sort((a, b) => b.intensity - a.intensity);
  const summary = ranked.length
    ? `${title}, strongest first: ${ranked.map((entry) => (entry.key === ' ' ? 'space bar' : entry.key)).join(', ')}.`
    : `${title}: none recorded.`;

  const cell = (label: string, x: number, y: number, width: number) => {
    const intensity = lookup.get(label === 'space' ? ' ' : label);
    const level = intensity === undefined ? 0 : band(intensity);
    return (
      <g key={`${label}-${x}-${y}`}>
        <rect className={`${styles.keyCap} ${styles[`heat${level}`]}`} x={x} y={y} width={width} height={KEY} rx={5}>
          {intensity !== undefined && <title>{`${label === 'space' ? 'Space bar' : label.toUpperCase()}: ${Math.round(intensity * 100)}% of this learner's worst key`}</title>}
        </rect>
        {label !== 'space' && (
          <text className={`${styles.keyLabel} ${level === 3 ? styles.keyLabelOnDark : level === 2 ? styles.keyLabelMid : ''}`} x={x + width / 2} y={y + KEY / 2} textAnchor="middle" dominantBaseline="central">
            {label.toUpperCase()}
          </text>
        )}
      </g>
    );
  };

  return (
    <figure className={styles.figure}>
      <svg className={styles.keyboard} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={summary}>
        {ROWS.map((row, rowIndex) =>
          [...row.keys].map((label, index) => cell(label, (row.offset + index) * UNIT, rowIndex * UNIT, KEY)),
        )}
        {cell('space', UNIT * 3, UNIT * 3, SPACE_WIDTH)}
      </svg>
      <figcaption className={styles.legend}>
        <span><i className={`${styles.swatch} ${styles.heat1}`} /> Occasional slips</span>
        <span><i className={`${styles.swatch} ${styles.heat2}`} /> Frequent</span>
        <span><i className={`${styles.swatch} ${styles.heat3}`} /> Worst keys</span>
      </figcaption>
    </figure>
  );
}
