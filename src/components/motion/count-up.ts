/** Cubic ease-out: fast start, gentle landing. */
export function easeOutCubic(progress: number): number {
  const clamped = Math.min(1, Math.max(0, progress));
  return 1 - Math.pow(1 - clamped, 3);
}

/**
 * The number to show `elapsedMs` into a count-up. Waits `delayMs`, then eases to `end`.
 * Always lands exactly on `end`, so the final screen is never off by a rounding step.
 */
export function countUpValue(end: number, elapsedMs: number, durationMs: number, delayMs = 0): number {
  if (!Number.isFinite(end)) return 0;
  if (durationMs <= 0) return end;
  const progress = (elapsedMs - delayMs) / durationMs;
  if (progress >= 1) return end;
  return Math.round(end * easeOutCubic(progress));
}
