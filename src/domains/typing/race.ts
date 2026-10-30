/**
 * Ghost race math. The ghost types at a fixed WPM; 5 characters = 1 word,
 * matching the evaluator's WPM standard.
 */

export function ghostCharPace(ghostWpm: number): number {
  return (Math.max(0, ghostWpm) * 5) / 60_000;
}

/** Characters the ghost has finished after `elapsedMs`. */
export function ghostCharsAt(ghostWpm: number, elapsedMs: number): number {
  return ghostCharPace(ghostWpm) * Math.max(0, elapsedMs);
}

export interface RaceOutcome {
  won: boolean;
  /** Positive when you finished first by that many ms, negative when the ghost did. */
  marginMs: number;
  ghostFinishMs: number;
  youFinishMs: number;
}

/** Compares your finish time against the ghost's fixed pace over the passage. */
export function raceOutcome(passageLength: number, youFinishMs: number, ghostWpm: number): RaceOutcome {
  // A zero or negative pace would mean the ghost never finishes; one word per
  // minute keeps the math finite and still trivially beatable.
  const wpm = Math.max(1, ghostWpm);
  const ghostFinishMs = passageLength / ghostCharPace(wpm);
  return {
    won: youFinishMs < ghostFinishMs,
    marginMs: ghostFinishMs - youFinishMs,
    ghostFinishMs,
    youFinishMs,
  };
}
