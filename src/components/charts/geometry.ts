export interface Point {
  x: number;
  y: number;
}

export interface Scale {
  (value: number): number;
}

/** Linear map from a data domain to a pixel range. A zero-width domain centres the value. */
export function linearScale(domain: [number, number], range: [number, number]): Scale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  if (d0 === d1) return () => (r0 + r1) / 2;
  return (value) => r0 + ((value - d0) / (d1 - d0)) * (r1 - r0);
}

/**
 * Rounds an axis ceiling up to a readable number so gridlines land on round
 * values (30, 50, 100) instead of the raw data maximum.
 */
export function niceCeiling(max: number, minimum = 10): number {
  const value = Math.max(max, minimum);
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    if (step * magnitude >= value) return step * magnitude;
  }
  return 10 * magnitude;
}

export function linePath(points: Point[]): string {
  if (!points.length) return '';
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${round(point.x)},${round(point.y)}`).join(' ');
}

export function areaPath(points: Point[], baseline: number): string {
  if (!points.length) return '';
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath(points)} L${round(last.x)},${round(baseline)} L${round(first.x)},${round(baseline)} Z`;
}

export function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Evenly spaced tick values from 0 to `ceiling`, inclusive. */
export function ticks(ceiling: number, count = 4): number[] {
  return Array.from({ length: count + 1 }, (_, index) => round((ceiling / count) * index));
}
