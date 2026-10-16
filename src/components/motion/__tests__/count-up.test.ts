import { countUpValue, easeOutCubic } from '../count-up';

describe('easeOutCubic', () => {
  it('runs from 0 to 1 and clamps outside that range', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(-5)).toBe(0);
    expect(easeOutCubic(5)).toBe(1);
  });

  it('moves faster at the start than at the end', () => {
    expect(easeOutCubic(0.25) - easeOutCubic(0)).toBeGreaterThan(easeOutCubic(1) - easeOutCubic(0.75));
  });
});

describe('countUpValue', () => {
  it('holds at zero during the delay', () => {
    expect(countUpValue(100, 100, 1000, 300)).toBe(0);
  });

  it('lands exactly on the end value once the duration has passed', () => {
    expect(countUpValue(96, 5000, 900, 450)).toBe(96);
    expect(countUpValue(34, 1350, 900, 450)).toBe(34);
  });

  it('never overshoots the end value', () => {
    for (let elapsed = 0; elapsed <= 2000; elapsed += 50) {
      expect(countUpValue(250, elapsed, 900, 450)).toBeLessThanOrEqual(250);
    }
  });

  it('never goes backwards', () => {
    let previous = 0;
    for (let elapsed = 0; elapsed <= 2000; elapsed += 25) {
      const value = countUpValue(250, elapsed, 900, 450);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });

  it('jumps straight to the end when there is no duration', () => {
    expect(countUpValue(42, 0, 0)).toBe(42);
  });

  it('returns 0 for a value that is not a finite number', () => {
    expect(countUpValue(Number.NaN, 500, 900)).toBe(0);
  });
});
