import { createDefenseGame, DefenseStatus } from '../defense-engine';
import type { QuestRound } from '../../dojo-quest/quest-engine';
import { TypingEvaluator } from '@/domains/typing/evaluator';

it('plays all waves, excludes pauses, records honest strokes, and cleans up', () => {
  let callback: FrameRequestCallback = () => {};
  let now = 0;
  const listeners: Record<string, (event: KeyboardEvent) => void> = {};
  const context = new Proxy(
    {},
    {
      get: (_, key) =>
        key === 'measureText' ? (value: string) => ({ width: value.length * 12 }) : () => {},
    },
  );
  const canvas = {
    getContext: () => context,
    addEventListener: (key: string, handler: (event: KeyboardEvent) => void) => {
      listeners[key] = handler;
    },
    removeEventListener: (key: string) => {
      delete listeners[key];
    },
    focus: () => {
      doc.activeElement = canvas;
    },
  };
  const doc = { activeElement: canvas as unknown, hidden: false };
  const originals = new Map<string, PropertyDescriptor | undefined>();
  const install = (name: string, value: unknown) => {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  };
  install('document', doc);
  install('getComputedStyle', () => ({ fontFamily: 'sans-serif' }));
  install('matchMedia', () => ({ matches: true }));
  install('requestAnimationFrame', (cb: FrameRequestCallback) => {
    callback = cb;
    return 1;
  });
  install('cancelAnimationFrame', jest.fn());
  install(
    'Image',
    class {
      height = 192;
      width = 3840;
      onload: (() => void) | null = null;
      onerror = null;
      set src(_value: string) {
        this.onload?.();
      }
    },
  );
  install(
    'Audio',
    class {
      pause() {}
    },
  );
  jest.spyOn(performance, 'now').mockReturnValue(0);
  jest.spyOn(Math, 'random').mockReturnValue(0);
  let status: DefenseStatus | undefined;
  const ended = jest.fn<void, [QuestRound]>(),
    ready = jest.fn(),
    error = jest.fn();
  const key = (value: string, props = {}) =>
    listeners.keydown({
      key: value,
      preventDefault: jest.fn(),
      ...props,
    } as unknown as KeyboardEvent);
  const tick = (count = 4) => {
    for (let i = 0; i < count; i++) {
      now += 50;
      callback(now);
    }
  };
  try {
    const game = createDefenseGame(
      canvas as unknown as HTMLCanvasElement,
      {
        words: ['cat', 'key', 'row', 'sun'],
        bossLine: 'unused',
        source: 'fallback',
        focusKeys: [],
      },
      ended,
      (value) => {
        status = value;
      },
      ready,
      error,
    );
    expect(ready).toHaveBeenCalledTimes(1);
    key('Enter');
    tick();
    doc.activeElement = null;
    tick(); // Status reports are throttled; take the baseline once paused.
    const initialTime = status!.remaining;
    key('x');
    tick(200);
    expect(status!.paused).toBe(true);
    expect(status!.remaining).toBe(initialTime);
    doc.activeElement = canvas;
    doc.hidden = true;
    key('x');
    tick(200);
    expect(status!.remaining).toBe(initialTime);
    doc.hidden = false;
    let intermissions = 0;
    let typo = false;
    for (let i = 0; i < 100 && !ended.mock.calls.length; i++) {
      tick();
      if (status!.phase === 'between') {
        intermissions++;
        tick(100);
        key('Enter');
        tick();
      }
      if (status!.phase === 'playing') {
        key('x', { ctrlKey: true });
        key('x', { repeat: true });
        if (!typo) {
          key('x');
          typo = true;
        }
        for (const char of status!.word) key(char);
      }
    }
    tick();
    expect(ended).toHaveBeenCalledTimes(1);
    expect(intermissions).toBe(5);
    const round = ended.mock.calls[0][0];
    expect(round.won).toBe(true);
    expect(round.cleared).toBe(18);
    expect(round.hearts).toBe(3);
    expect(round.durationMs).toBeLessThan(now - 44000);
    expect(round.keystrokes.filter((stroke) => stroke.actual === 'x')).toHaveLength(1);
    expect(
      round.keystrokes.every((stroke) => round.passage[stroke.position] === stroke.expected),
    ).toBe(true);
    const result = new TypingEvaluator().evaluate({
      studentId: 'qa',
      exerciseId: 'game-dojo-defense',
      passage: round.passage,
      keystrokes: round.keystrokes,
      startedAt: 0,
      completedAt: round.durationMs,
      skillIds: ['typing-common-words'],
    });
    expect(result.isValid).toBe(true);
    expect(result.accuracy).toBeLessThan(100);
    game.destroy();
    expect(Object.keys(listeners)).toEqual([]);
    expect(error).not.toHaveBeenCalled();
  } finally {
    jest.restoreAllMocks();
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
});
