import { trailCounterDamage } from '@/domains/typing/pokemon';
import type { PokemonEncounter, TrailBattle } from '@/domains/typing/pokemon';

export type TrailElement = 'leaf' | 'ember' | 'bubble' | 'spark';
export type TrailCue = 'word' | 'mistake' | 'attack' | 'guard' | 'capture' | 'retry' | 'escape';
export interface TrailFeedback {
  cue: TrailCue;
  damage: number;
  counter: number;
}
export function trailElement(type: string): TrailElement {
  if (type === 'Grass' || type === 'Bug') return 'leaf';
  if (type === 'Fire') return 'ember';
  if (type === 'Water' || type === 'Ice') return 'bubble';
  return 'spark';
}
/** Feedback follows the same resolved state as the server replay, never a separate battle model. */
export function trailFeedback(
  previous: TrailBattle,
  next: TrailBattle,
  encounter: PokemonEncounter,
): TrailFeedback | null {
  const damage = previous.opponentHp - next.opponentHp;
  if (next.turns !== previous.turns) {
    return {
      cue: previous.guarding ? 'guard' : 'attack',
      damage,
      counter:
        next.opponentHp > 0
          ? trailCounterDamage(
              encounter,
              previous.promptAttempts + 1 - previous.prompt.length,
              previous.guarding,
            )
          : 0,
    };
  }
  if (next.phase === 'caught' && previous.phase !== 'caught')
    return { cue: 'capture', damage: 0, counter: 0 };
  if (previous.phase === 'capture' && next.phase === 'escaped')
    return { cue: 'escape', damage: 0, counter: 0 };
  if (next.captureTries > previous.captureTries) return { cue: 'retry', damage: 0, counter: 0 };
  if (next.promptAttempts > previous.promptAttempts && next.cursor === previous.cursor)
    return { cue: 'mistake', damage: 0, counter: 0 };
  if (next.cursor > previous.cursor && previous.prompt[previous.cursor] === ' ')
    return { cue: 'word', damage: 0, counter: 0 };
  return null;
}
