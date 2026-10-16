'use client';

import { useEffect, useState } from 'react';
import { countUpValue } from './count-up';

interface CountUpProps {
  value: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
  delayMs?: number;
}

// A parent such as `.stats span` styles every span inside it as a label. These inline values
// keep the animated number looking exactly like the plain number it turns into.
const INHERIT_LOOK = { font: 'inherit', color: 'inherit', letterSpacing: 'inherit' } as const;

const VISUALLY_HIDDEN = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;

/**
 * Counts up to `value` once. Assistive technology always reads the final number, and
 * visitors who ask for reduced motion see it straight away with no animation.
 */
export default function CountUp({ value, prefix = '', suffix = '', durationMs = 900, delayMs = 450 }: CountUpProps) {
  // null means "show the real value". It stays null until the first animation frame, so the
  // server render and the reduced-motion case both show the final number.
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const next = countUpValue(value, now - start, durationMs, delayMs);
      setShown(next < value ? next : null);
      if (next < value) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs, delayMs]);

  const final = `${prefix}${value}${suffix}`;
  if (shown === null) return <>{final}</>;
  return (
    <>
      <span aria-hidden="true" style={INHERIT_LOOK}>{`${prefix}${shown}${suffix}`}</span>
      <span style={{ ...INHERIT_LOOK, ...VISUALLY_HIDDEN }}>{final}</span>
    </>
  );
}
