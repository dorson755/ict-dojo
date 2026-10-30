import { ghostCharsAt, ghostCharPace, raceOutcome } from '../race';

describe('ghostCharPace', () => {
  it('converts WPM to characters per millisecond, 5 chars per word', () => {
    expect(ghostCharPace(60)).toBeCloseTo(0.005, 6); // 300 chars/min
    expect(ghostCharPace(0)).toBe(0);
  });
});

describe('ghostCharsAt', () => {
  it('covers 300 characters in one minute at 60 WPM', () => {
    expect(ghostCharsAt(60, 60_000)).toBe(300);
    expect(ghostCharsAt(60, 30_000)).toBe(150);
  });

  it('never moves backwards', () => {
    expect(ghostCharsAt(60, -5_000)).toBe(0);
  });
});

describe('raceOutcome', () => {
  it('declares a win with a positive margin when you finish first', () => {
    const outcome = raceOutcome(300, 50_000, 60);
    expect(outcome.ghostFinishMs).toBe(60_000);
    expect(outcome.won).toBe(true);
    expect(outcome.marginMs).toBe(10_000);
  });

  it('declares a loss with a negative margin when the ghost finishes first', () => {
    const outcome = raceOutcome(300, 70_000, 60);
    expect(outcome.won).toBe(false);
    expect(outcome.marginMs).toBe(-10_000);
  });

  it('treats an exact tie as a loss for the racer', () => {
    expect(raceOutcome(300, 60_000, 60).won).toBe(false);
    expect(raceOutcome(300, 60_000, 60).marginMs).toBe(0);
  });

  it('keeps the math finite for a zero-pace ghost', () => {
    const outcome = raceOutcome(300, 120_000, 0);
    expect(outcome.won).toBe(true);
    expect(Number.isFinite(outcome.ghostFinishMs)).toBe(true);
  });
});
