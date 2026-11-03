/** @jest-environment jsdom */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import TypingEngine from '../TypingEngine';

jest.mock('../TypingEngine.module.css', () => ({}));

let host: HTMLDivElement;
let root: Root;
const onComplete = jest.fn();
const onProgress = jest.fn();

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  act(() => {
    root.render(
      <TypingEngine
        passage="cat"
        studentId="student"
        exerciseId="test"
        skillIds={[]}
        onComplete={onComplete}
        onProgress={onProgress}
      />,
    );
  });
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

function startTyping() {
  const button = host.querySelector('button')!;
  // Windows browsers focus a button before dispatching its click.
  act(() => button.focus());
  expect(button.isConnected).toBe(true);
  act(() => button.click());
  expect(document.activeElement).toBe(host.querySelector('[role="textbox"]'));
}

function key(value: string) {
  act(() => {
    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true }),
    );
  });
}

it('retains the start control during mouse/keyboard focus and accepts typing after activation', () => {
  startTyping();
  key('c');
  expect(onProgress).toHaveBeenLastCalledWith(1, expect.any(Number));
  key('a');
  key('t');
  expect(onComplete).toHaveBeenCalledTimes(1);
  expect(
    onComplete.mock.calls[0][0].keystrokes.map((event: { actual: string }) => event.actual),
  ).toEqual(['c', 'a', 't']);
});

it('restores real typing focus after leaving and resuming an exercise', () => {
  startTyping();
  key('c');
  const outside = document.createElement('button');
  document.body.append(outside);
  act(() => outside.focus());
  expect(host.querySelector('button')).not.toBeNull();
  startTyping();
  key('a');
  expect(onProgress).toHaveBeenLastCalledWith(2, expect.any(Number));
  outside.remove();
});

it('does not intercept Space or count typing while the start button has focus', () => {
  const button = host.querySelector('button')!;
  act(() => button.focus());
  const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
  act(() => button.dispatchEvent(space));
  expect(space.defaultPrevented).toBe(false);
  expect(onProgress).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(button);
});
