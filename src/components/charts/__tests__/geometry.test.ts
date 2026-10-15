import { areaPath, linePath, linearScale, niceCeiling, ticks } from '../geometry';

describe('linearScale', () => {
  it('maps the domain onto the range', () => {
    const scale = linearScale([0, 100], [200, 0]);
    expect(scale(0)).toBe(200);
    expect(scale(100)).toBe(0);
    expect(scale(25)).toBe(150);
  });

  it('centres values when the domain has no width', () => {
    expect(linearScale([5, 5], [0, 100])(5)).toBe(50);
  });
});

describe('niceCeiling', () => {
  it('rounds up to a readable axis maximum', () => {
    expect(niceCeiling(94)).toBe(100);
    expect(niceCeiling(31)).toBe(40);
    expect(niceCeiling(48)).toBe(50);
    expect(niceCeiling(100)).toBe(100);
  });

  it('never goes below the minimum', () => {
    expect(niceCeiling(2)).toBe(10);
    expect(niceCeiling(0)).toBe(10);
  });
});

describe('paths', () => {
  const points = [{ x: 0, y: 10 }, { x: 50, y: 4.5 }, { x: 100, y: 20 }];

  it('builds a polyline path', () => {
    expect(linePath(points)).toBe('M0,10 L50,4.5 L100,20');
  });

  it('closes an area down to the baseline', () => {
    expect(areaPath(points, 30)).toBe('M0,10 L50,4.5 L100,20 L100,30 L0,30 Z');
  });

  it('returns an empty path for no points', () => {
    expect(linePath([])).toBe('');
    expect(areaPath([], 30)).toBe('');
  });
});

describe('ticks', () => {
  it('spreads ticks evenly from zero to the ceiling', () => {
    expect(ticks(100, 4)).toEqual([0, 25, 50, 75, 100]);
  });
});
