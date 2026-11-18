/** @jest-environment jsdom */
import {
  DEFAULT_TRAIL_MUSIC,
  DEFAULT_TRAIL_SOUND,
  readTrailMusic,
  readTrailSound,
  TRAIL_MUSIC_KEY,
  TRAIL_SOUND_KEY,
  TrailAudio,
  writeTrailMusic,
  writeTrailSound,
} from '../trail-audio';
import type { TrailCue, TrailElement } from '../trail-feedback';

function parameter() {
  return {
    setValueAtTime: jest.fn(),
    linearRampToValueAtTime: jest.fn(),
    exponentialRampToValueAtTime: jest.fn(),
  };
}
function oscillator() {
  return {
    type: 'sine',
    frequency: parameter(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    onended: null as (() => void) | null,
  };
}
const voices: ReturnType<typeof oscillator>[] = [];
const context = {
  currentTime: 1,
  state: 'suspended',
  destination: {},
  createGain: jest.fn(() => ({ gain: parameter(), connect: jest.fn(), disconnect: jest.fn() })),
  createOscillator: jest.fn(() => {
    const voice = oscillator();
    voices.push(voice);
    return voice;
  }),
  resume: jest.fn(async () => {
    context.state = 'running';
  }),
  suspend: jest.fn(async () => {
    context.state = 'suspended';
  }),
  close: jest.fn(async () => {
    context.state = 'closed';
  }),
};
const Audio = jest.fn(() => context);
const original = Object.getOwnPropertyDescriptor(window, 'AudioContext');
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  voices.length = 0;
  context.currentTime = 1;
  context.state = 'suspended';
  Object.defineProperty(window, 'AudioContext', { configurable: true, value: Audio });
});
afterEach(() => {
  jest.restoreAllMocks();
  if (original) Object.defineProperty(window, 'AudioContext', original);
  else Reflect.deleteProperty(window, 'AudioContext');
});
it('defaults to muted, safely restores preferences, and tolerates blocked storage', () => {
  expect(readTrailSound()).toEqual(DEFAULT_TRAIL_SOUND);
  expect(readTrailMusic()).toEqual(DEFAULT_TRAIL_MUSIC);
  writeTrailSound({ enabled: true, volume: 0.4 });
  writeTrailMusic({ enabled: true, volume: 0.4 });
  expect(readTrailSound()).toEqual({ enabled: true, volume: 0.4 });
  expect(readTrailMusic()).toEqual({ enabled: true, volume: 0.4 });
  localStorage.setItem(TRAIL_SOUND_KEY, '{"enabled":true,"volume":9}');
  localStorage.setItem(TRAIL_MUSIC_KEY, '{"enabled":true,"volume":9}');
  expect(readTrailSound().volume).toBe(1);
  expect(readTrailMusic().volume).toBe(1);
  localStorage.setItem(TRAIL_SOUND_KEY, '{"enabled":"true","volume":0.5}');
  localStorage.setItem(TRAIL_MUSIC_KEY, '{"enabled":"true","volume":0.5}');
  expect(readTrailSound()).toEqual(DEFAULT_TRAIL_SOUND);
  expect(readTrailMusic()).toEqual(DEFAULT_TRAIL_MUSIC);
  localStorage.setItem(TRAIL_SOUND_KEY, 'broken json');
  localStorage.setItem(TRAIL_MUSIC_KEY, 'broken json');
  expect(readTrailSound()).toEqual(DEFAULT_TRAIL_SOUND);
  expect(readTrailMusic()).toEqual(DEFAULT_TRAIL_MUSIC);
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('Blocked');
  });
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Blocked');
  });
  expect(readTrailSound()).toEqual(DEFAULT_TRAIL_SOUND);
  expect(readTrailMusic()).toEqual(DEFAULT_TRAIL_MUSIC);
  expect(() => writeTrailSound(DEFAULT_TRAIL_SOUND)).not.toThrow();
  expect(() => writeTrailMusic(DEFAULT_TRAIL_MUSIC)).not.toThrow();
});
it('never creates or resumes audio just because preferences were restored', async () => {
  const audio = new TrailAudio();
  audio.play({ cue: 'attack', damage: 28, counter: 0 }, 'leaf');
  expect(await audio.unlock()).toBe(false);
  audio.configure({ enabled: true, volume: 0.35 });
  expect(Audio).not.toHaveBeenCalled();
  audio.play({ cue: 'attack', damage: 28, counter: 0 }, 'leaf');
  expect(voices).toHaveLength(0);
  expect(await audio.unlock()).toBe(true);
  expect(Audio).toHaveBeenCalledTimes(1);
  audio.destroy();
});
it('loops the original theme only while music is enabled and the battle is active', async () => {
  const audio = new TrailAudio();
  audio.configureMusic({ enabled: true, volume: 0.3 });
  expect(await audio.unlock()).toBe(true);
  expect(voices).toHaveLength(0);

  jest.useFakeTimers();
  try {
    audio.setMusicActive(true);
    expect(voices).toHaveLength(2);
    expect(voices[0].type).toBe('square');
    expect(voices[0].frequency.setValueAtTime).toHaveBeenCalledWith(659.25, 1.025);
    expect(voices[1].type).toBe('triangle');

    jest.advanceTimersByTime(4000);
    expect(voices.length).toBeGreaterThan(10);

    audio.setMusicActive(false);
    const stoppedCount = voices.length;
    expect(voices.every((voice) => voice.stop.mock.calls.length > 0)).toBe(true);
    jest.advanceTimersByTime(1000);
    expect(voices).toHaveLength(stoppedCount);

    audio.setMusicActive(true);
    expect(voices).toHaveLength(stoppedCount + 2);
    audio.configureMusic({ enabled: false, volume: 0.3 });
    const mutedCount = voices.length;
    jest.advanceTimersByTime(1000);
    expect(voices).toHaveLength(mutedCount);
  } finally {
    audio.destroy();
    jest.useRealTimers();
  }
});
it('plays distinct elemental attacks and a delayed counterattack with bounded voices', async () => {
  const audio = new TrailAudio();
  audio.configure({ enabled: true, volume: 0.5 });
  await audio.unlock();
  for (const element of ['leaf', 'ember', 'bubble', 'spark'] as TrailElement[])
    audio.play({ cue: 'attack', damage: 20, counter: 6 }, element);
  expect(voices).toHaveLength(8);
  expect(voices[1].start).toHaveBeenCalledWith(1.42);
  expect(voices[0].frequency.setValueAtTime).toHaveBeenCalledWith(420, 1);
  expect(voices[2].frequency.setValueAtTime).toHaveBeenCalledWith(180, 1);
  expect(voices[4].frequency.setValueAtTime).toHaveBeenCalledWith(240, 1);
  expect(voices[6].frequency.setValueAtTime).toHaveBeenCalledWith(740, 1);
  for (let i = 0; i < 100; i++) audio.play({ cue: 'attack', damage: 20, counter: 6 }, 'spark');
  expect(voices).toHaveLength(12);
  voices[0].onended?.();
  expect(voices[0].disconnect).toHaveBeenCalled();
  audio.destroy();
});
it('throttles repeated typo and word sounds, and supports all non-attack cues', async () => {
  const audio = new TrailAudio();
  audio.configure({ enabled: true, volume: 0.5 });
  await audio.unlock();
  for (let i = 0; i < 20; i++) audio.play({ cue: 'mistake', damage: 0, counter: 0 }, 'leaf');
  expect(voices).toHaveLength(1);
  for (const cue of ['word', 'guard', 'capture', 'retry', 'escape'] as TrailCue[]) {
    context.currentTime += 1;
    audio.play({ cue, damage: 0, counter: 0 }, 'leaf');
  }
  expect(voices).toHaveLength(9);
  audio.destroy();
});
it('stops scheduled sounds on mute, volume zero, blur, and teardown without replaying them', async () => {
  const audio = new TrailAudio();
  audio.configure({ enabled: true, volume: 0.5 });
  await audio.unlock();
  audio.play({ cue: 'capture', damage: 0, counter: 0 }, 'bubble');
  expect(voices).toHaveLength(4);
  audio.configure({ enabled: false, volume: 0.5 });
  for (const voice of voices) expect(voice.stop).toHaveBeenCalledTimes(2);
  audio.play({ cue: 'attack', damage: 20, counter: 0 }, 'bubble');
  expect(voices).toHaveLength(4);
  audio.configure({ enabled: true, volume: 0 });
  audio.play({ cue: 'attack', damage: 20, counter: 0 }, 'bubble');
  expect(voices).toHaveLength(4);
  audio.pause();
  expect(context.suspend).toHaveBeenCalled();
  audio.destroy();
  expect(context.close).toHaveBeenCalledTimes(1);
  expect(await audio.unlock()).toBe(false);
});
it('fails silently when browser audio is missing or cannot start', async () => {
  Object.defineProperty(window, 'AudioContext', { configurable: true, value: undefined });
  const audio = new TrailAudio();
  audio.configure({ enabled: true, volume: 0.5 });
  expect(await audio.unlock()).toBe(false);
  expect(() => audio.play({ cue: 'attack', damage: 20, counter: 0 }, 'ember')).not.toThrow();
  Object.defineProperty(window, 'AudioContext', {
    configurable: true,
    value: jest.fn(() => {
      throw new Error('Unavailable');
    }),
  });
  expect(await audio.unlock()).toBe(false);
  audio.destroy();
});
it('does not let an audio-device failure escape into the typing input handler', async () => {
  const audio = new TrailAudio();
  audio.configure({ enabled: true, volume: 0.5 });
  await audio.unlock();
  context.createOscillator.mockImplementationOnce(() => {
    throw new Error('Device lost');
  });
  expect(() => audio.play({ cue: 'attack', damage: 20, counter: 6 }, 'spark')).not.toThrow();
  audio.destroy();
});
