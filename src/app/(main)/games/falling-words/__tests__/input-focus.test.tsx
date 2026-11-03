/** @jest-environment jsdom */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import FallingWordsClient from '../FallingWordsClient';

jest.mock('../falling-words.module.css', () => ({}));
jest.mock('@/app/(main)/practice/actions', () => ({ submitPracticeSession: jest.fn() }));

it('keeps the resume button alive until activation and restores game keyboard focus', () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = jest.fn().mockReturnValue({ matches: false });
  const raf = jest.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
  const cancel = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  const host = document.createElement('div');
  const outside = document.createElement('button');
  document.body.append(host, outside);
  const root: Root = createRoot(host);
  try {
    act(() => root.render(<FallingWordsClient studentId="student" weakKeys={{}} />));
    const start = host.querySelector('button')!;
    act(() => start.focus());
    act(() => start.click());
    const area = host.querySelector('[role="textbox"]')!;
    expect(document.activeElement).toBe(area);
    act(() => outside.focus());
    const resume = host.querySelector('button')!;
    expect(resume.textContent).toBe('Click to keep playing');
    act(() => resume.focus());
    expect(resume.isConnected).toBe(true);
    act(() => resume.click());
    expect(document.activeElement).toBe(area);
  } finally {
    act(() => root.unmount());
    host.remove();
    outside.remove();
    raf.mockRestore();
    cancel.mockRestore();
  }
});
