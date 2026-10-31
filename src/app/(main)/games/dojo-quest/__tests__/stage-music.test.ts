import { createStageMusic } from '../stage-music';

class Media {
  static instances: Media[] = [];
  paused = true;
  volume = 1;
  loop = false;
  preload = '';
  src = '';
  play = jest.fn(() => {
    this.paused = false;
    return Promise.resolve();
  });
  pause = jest.fn(() => {
    this.paused = true;
  });
  load = jest.fn();
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
  removeAttribute = jest.fn();
  constructor() {
    Media.instances.push(this);
  }
}
const original = Object.getOwnPropertyDescriptor(globalThis, 'Audio');
beforeEach(() => {
  Media.instances = [];
  Object.defineProperty(globalThis, 'Audio', { configurable: true, value: Media });
});
afterEach(() => {
  if (original) Object.defineProperty(globalThis, 'Audio', original);
  else Reflect.deleteProperty(globalThis, 'Audio');
});

it('does not download or autoplay music until enabled and active', () => {
  const music = createStageMusic('forest', jest.fn());
  music.setActive(true);
  expect(Media.instances).toHaveLength(0);
  music.setEnabled(true);
  expect(Media.instances).toHaveLength(1);
  expect(Media.instances[0].src).toBe('/dojo-quest/music/forest.mp3');
  expect(Media.instances[0].loop).toBe(true);
  expect(Media.instances[0].volume).toBe(0.25);
  music.destroy();
});

it('switches to the fight track for bosses and duels and pauses when inactive', async () => {
  const music = createStageMusic('courtyard', jest.fn());
  music.setActive(true);
  music.setEnabled(true);
  await Promise.resolve();
  const media = Media.instances[0];
  music.setScene('boss');
  expect(media.src).toBe('/dojo-quest/music/fight.mp3');
  music.setActive(false);
  expect(media.paused).toBe(true);
  music.setVolume(4);
  expect(media.volume).toBe(1);
  music.setVolume(NaN);
  expect(media.volume).toBe(1);
  music.setEnabled(false);
  expect(media.paused).toBe(true);
  music.destroy();
  expect(media.removeEventListener).toHaveBeenCalled();
  expect(media.load).toHaveBeenCalled();
});

it('reports an autoplay or decode failure without breaking the game', async () => {
  const failed = jest.fn();
  const music = createStageMusic('temple', failed);
  music.setActive(true);
  music.setEnabled(true);
  const media = Media.instances[0];
  await new Promise((resolve) => setImmediate(resolve));
  media.play.mockImplementation(() => Promise.reject(new Error('Playback blocked')));
  music.setActive(false);
  music.setActive(true);
  await new Promise((resolve) => setImmediate(resolve));
  expect(failed).toHaveBeenCalledTimes(1);
  expect(media.paused).toBe(true);
  music.destroy();
});

it('resumes if focus returns while an earlier play is settling', async () => {
  const music = createStageMusic('village', jest.fn());
  music.setActive(true);
  music.setEnabled(true);
  const media = Media.instances[0];
  music.setActive(false);
  music.setActive(true);
  await new Promise((resolve) => setImmediate(resolve));
  expect(media.paused).toBe(false);
  expect(media.play).toHaveBeenCalledTimes(2);
  music.destroy();
});

it('treats a DOM-style AbortError as an interruption, not a playback failure', async () => {
  const failed = jest.fn();
  const music = createStageMusic('courtyard', failed);
  music.setActive(true);
  music.setEnabled(true);
  const media = Media.instances[0];
  await new Promise((resolve) => setImmediate(resolve));
  media.play.mockImplementationOnce(() => Promise.reject({ name: 'AbortError' }));
  music.setActive(false);
  music.setActive(true);
  await new Promise((resolve) => setImmediate(resolve));
  expect(failed).not.toHaveBeenCalled();
  expect(media.paused).toBe(false);
  music.destroy();
});
