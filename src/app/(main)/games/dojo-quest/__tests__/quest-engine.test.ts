import { createQuestGame, QuestRound, QuestStatus } from '../quest-engine';
import { createDuelGame } from '../duel-engine';
import { QUEST_STAGES } from '@/domains/typing/quest';
import { TypingEvaluator } from '@/domains/typing/evaluator';

it.each(['quest', 'duel'])('plays through %s, pauses, logs errors, and cleans up', (mode) => {
  let callback: FrameRequestCallback = () => {};
  let now = 0;
  const listeners: Record<string, (event: KeyboardEvent) => void> = {};
  const context = new Proxy(
    {},
    {
      get: (_, key) =>
        key === 'measureText' ? (value: string) => ({ width: value.length * 4 }) : () => {},
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
  const doc = {
    activeElement: canvas as unknown,
    hidden: false,
    createElement: () => ({ getContext: () => context }),
  };
  const originals = new Map<string, PropertyDescriptor | undefined>();
  const install = (name: string, value: unknown) => {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  };
  install('document', doc);
  install('matchMedia', () => ({ matches: true }));
  install('requestAnimationFrame', (cb: FrameRequestCallback) => {
    callback = cb;
    return 1;
  });
  install('cancelAnimationFrame', jest.fn());
  install(
    'Image',
    class {
      height = 32;
      width = 128;
      onload = () => {};
      set src(_value: string) {
        this.onload();
      }
    },
  );
  install(
    'Audio',
    class {
      volume = 0;
      pause() {}
    },
  );
  jest.spyOn(performance, 'now').mockReturnValue(0);
  jest.spyOn(Math, 'random').mockReturnValue(0);
  let status: QuestStatus = { phase: '', words: [], hearts: 3, cleared: 0, target: '', scroll: '' };
  const ended = jest.fn<void, [QuestRound]>();
  const ready = jest.fn(),
    error = jest.fn();
  const key = (value: string, ctrlKey = false) =>
    listeners.keydown({
      key: value,
      ctrlKey,
      preventDefault: jest.fn(),
    } as unknown as KeyboardEvent);
  const tick = () => {
    now += 50;
    callback(now);
  };
  try {
    const content = {
      words: ['the', 'and', 'key', 'row'],
      bossLine: 'calm hands can find the way',
      source: 'fallback' as const,
      focusKeys: [],
    };
    const callbacks = [
      ended,
      (value) => {
        status = value;
      },
      ready,
      error,
    ] as const satisfies [
      (round: QuestRound) => void,
      (status: QuestStatus) => void,
      () => void,
      () => void,
    ];
    const game =
      mode === 'duel'
        ? createDuelGame(canvas as unknown as HTMLCanvasElement, content, ...callbacks)
        : createQuestGame(
            canvas as unknown as HTMLCanvasElement,
            QUEST_STAGES[0],
            content,
            ...callbacks,
          );
    expect(ready).toHaveBeenCalledTimes(1);
    key('Enter');
    doc.activeElement = null;
    for (let i = 0; i < 200; i++) tick();
    doc.activeElement = canvas;
    let typos = 0;
    for (let i = 0; i < 1200 && status.phase !== 'bossIntro' && status.phase !== 'clear'; i++) {
      tick();
      if (status.words.length) {
        key('x', true); // Modifier shortcuts never count.
        if (mode === 'quest' || typos === 0) {
          key('x');
          typos++;
        }
        for (const char of status.words[0]) key(char);
        for (let j = 0; j < 5; j++) tick();
      }
    }
    if (mode === 'quest') {
      expect(status.phase).toBe('bossIntro');
      key('Enter');
      for (let i = 0; i < 25; i++) tick();
      for (const char of content.bossLine) key(char);
    }
    expect(ended).toHaveBeenCalledTimes(1);
    const round = ended.mock.calls[0][0];
    expect(round.won).toBe(true);
    expect(round.cleared).toBeGreaterThanOrEqual(9);
    expect(round.durationMs).toBeLessThan(now - 9000);
    expect(round.keystrokes.filter((stroke) => stroke.actual === 'x')).toHaveLength(typos);
    expect(round.keystrokes.filter((stroke) => stroke.expected === ' ')).toHaveLength(
      mode === 'quest' ? 5 : 0,
    );
    expect(
      round.keystrokes.every((stroke) => round.passage[stroke.position] === stroke.expected),
    ).toBe(true);
    const result = new TypingEvaluator().evaluate({
      studentId: 'test',
      exerciseId: 'quest',
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
