/** @jest-environment jsdom */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import TrailsClient from '../TrailsClient';
import { prepareTrailEncounter, finishTrailEncounter } from '../actions';
import { TrailAudio, TRAIL_MUSIC_KEY, TRAIL_SOUND_KEY } from '../trail-audio';
import type { PokemonCollection, PokemonEncounter } from '@/domains/typing/pokemon';
import { fallbackQuestContent, QUEST_STAGES } from '@/domains/typing/quest';

jest.mock('../trails.module.css', () => ({}));
jest.mock('../actions', () => ({
  changeTrailPartner: jest.fn(),
  chooseTrailStarter: jest.fn(),
  finishTrailEncounter: jest.fn(),
  leaveTrailEncounter: jest.fn(),
  prepareTrailEncounter: jest.fn(),
}));
jest.mock('../trail-audio', () => ({
  ...jest.requireActual('../trail-audio'),
  TrailAudio: jest.fn(),
}));
const player = {
  configure: jest.fn(),
  configureMusic: jest.fn(),
  setMusicActive: jest.fn(),
  unlock: jest.fn(),
  play: jest.fn(),
  stop: jest.fn(),
  pause: jest.fn(),
  destroy: jest.fn(),
};
const collection: PokemonCollection = {
  version: 1,
  partner: 'charmander',
  caught: { charmander: 0 },
  wins: 2,
  guardian: false,
  rewardDay: '',
  rewardsToday: 0,
};
const encounter: PokemonEncounter = {
  id: 'battle',
  opponent: 'pikachu',
  guardian: false,
  tutorial: false,
  words: fallbackQuestContent(QUEST_STAGES[0], {}).words,
  belt: 0,
  createdAt: new Date().toISOString(),
  rulesVersion: 2,
};
let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  (TrailAudio as jest.Mock).mockImplementation(() => player);
  player.unlock.mockResolvedValue(true);
  (prepareTrailEncounter as jest.Mock).mockResolvedValue({ ...collection, active: encounter });
  (finishTrailEncounter as jest.Mock).mockResolvedValue({
    collection,
    receipt: { id: 'battle', xp: 10, accuracy: 100, wpm: 20, won: true, caught: 'pikachu' },
  });
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(<TrailsClient initialCollection={collection} />));
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});
function button(text: string) {
  return [...host.querySelectorAll('button')].find((el) => el.textContent === text)!;
}
async function start() {
  await act(async () => button('Explore the meadow').click());
  return host.querySelector<HTMLInputElement>('#trail-typing')!;
}
function type(keys: string) {
  act(() => {
    for (const key of keys)
      host
        .querySelector('#trail-typing')!
        .dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });
}
function prompt() {
  return host.querySelector('#trail-typing')!.getAttribute('aria-label')!.slice('Type: '.length);
}
it('keeps sound opt-in, remembers volume, and restores preferences without autoplay', async () => {
  expect(button('Sound off').getAttribute('aria-pressed')).toBe('false');
  expect(host.querySelector<HTMLInputElement>('input[type="range"]')!.disabled).toBe(true);
  expect(player.unlock).not.toHaveBeenCalled();
  await act(async () => button('Sound off').click());
  expect(button('Sound on').getAttribute('aria-pressed')).toBe('true');
  expect(JSON.parse(localStorage.getItem(TRAIL_SOUND_KEY)!).enabled).toBe(true);
  const slider = host.querySelector<HTMLInputElement>('input[type="range"]')!;
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(slider, '70');
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  expect(JSON.parse(localStorage.getItem(TRAIL_SOUND_KEY)!).volume).toBe(0.7);
  await act(async () => button('Sound on').click());
  expect(player.configure).toHaveBeenLastCalledWith({ enabled: false, volume: 0.7 });
  localStorage.setItem(TRAIL_SOUND_KEY, JSON.stringify({ enabled: true, volume: 0.2 }));
  player.unlock.mockClear();
  act(() => root.render(<TrailsClient key="restored" initialCollection={collection} />));
  expect(button('Sound on').getAttribute('aria-pressed')).toBe('true');
  expect(host.querySelector<HTMLInputElement>('input[type="range"]')!.value).toBe('20');
  expect(player.unlock).not.toHaveBeenCalled();
});
it('keeps battle music opt-in and pauses it when typing loses focus', async () => {
  expect(button('Music off').getAttribute('aria-pressed')).toBe('false');
  expect(host.querySelectorAll<HTMLInputElement>('input[type="range"]')[1].disabled).toBe(true);
  expect(player.unlock).not.toHaveBeenCalled();
  await act(async () => button('Music off').click());
  expect(button('Music on').getAttribute('aria-pressed')).toBe('true');
  expect(JSON.parse(localStorage.getItem(TRAIL_MUSIC_KEY)!).enabled).toBe(true);
  expect(player.configureMusic).toHaveBeenLastCalledWith({ enabled: true, volume: 0.3 });
  expect(player.unlock).toHaveBeenCalled();
  const musicSlider = host.querySelectorAll<HTMLInputElement>('input[type="range"]')[1];
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
      musicSlider,
      '60',
    );
    musicSlider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  expect(JSON.parse(localStorage.getItem(TRAIL_MUSIC_KEY)!).volume).toBe(0.6);

  const input = await start();
  expect(player.setMusicActive).toHaveBeenLastCalledWith(true);
  act(() => input.blur());
  expect(player.setMusicActive).toHaveBeenLastCalledWith(false);
  act(() => input.focus());
  expect(player.setMusicActive).toHaveBeenLastCalledWith(true);

  await act(async () => button('Music on').click());
  expect(button('Music off').getAttribute('aria-pressed')).toBe('false');
  expect(player.configureMusic).toHaveBeenLastCalledWith({ enabled: false, volume: 0.6 });
  expect(button('Sound off').getAttribute('aria-pressed')).toBe('false');
});
it('restores music settings without starting audio automatically', () => {
  localStorage.setItem(TRAIL_MUSIC_KEY, JSON.stringify({ enabled: true, volume: 0.45 }));
  player.unlock.mockClear();
  act(() => root.render(<TrailsClient key="music-restored" initialCollection={collection} />));
  expect(button('Music on').getAttribute('aria-pressed')).toBe('true');
  expect(host.querySelectorAll<HTMLInputElement>('input[type="range"]')[1].value).toBe('45');
  expect(player.unlock).not.toHaveBeenCalled();
});
it('shows queued damage without attacking mid-word, then responds once without losing typing focus', async () => {
  const input = await start();
  const words = prompt();
  type('!');
  expect(host.textContent).toContain('6 HP response when this turn ends');
  expect(host.querySelector('[aria-label="Partner HP"]')!.getAttribute('aria-valuenow')).toBe(
    '100',
  );
  expect(host.querySelector('[data-feedback]')).toBeNull();
  type(words);
  expect(host.querySelector('[data-feedback]')!.getAttribute('data-feedback')).toBe('attack');
  expect(host.querySelector('[aria-label="Partner HP"]')!.getAttribute('aria-valuenow')).toBe('94');
  expect(host.textContent).toContain('Clean turn: no counterattack');
  expect(document.activeElement).toBe(input);
  expect(player.play).toHaveBeenCalledWith({ cue: 'attack', damage: 20, counter: 6 }, 'ember');
  type(prompt());
  expect(host.querySelector('[aria-label="Partner HP"]')!.getAttribute('aria-valuenow')).toBe('94');
  expect(document.activeElement).toBe(input);
});
it('finishes capture once, plays the celebration, and keeps returning to camp repeatable', async () => {
  await start();
  for (let i = 0; i < 4; i++) type(prompt());
  expect(host.textContent).toContain('Capture challenge');
  await act(async () => type(prompt()));
  expect(host.querySelector('[data-feedback="capture"]')).not.toBeNull();
  expect(player.play).toHaveBeenCalledWith({ cue: 'capture', damage: 0, counter: 0 }, 'ember');
  expect(finishTrailEncounter).toHaveBeenCalledTimes(1);
  act(() => button('Return to camp').click());
  expect(player.stop).toHaveBeenCalled();
  await start();
  expect(host.querySelector('[data-feedback]')).toBeNull();
  expect(host.querySelector('[aria-label="Partner HP"]')!.getAttribute('aria-valuenow')).toBe(
    '100',
  );
});
it('shows a shield during guard and keeps the tutorial damage-free', async () => {
  (prepareTrailEncounter as jest.Mock).mockResolvedValue({
    ...collection,
    active: { ...encounter, tutorial: true },
  });
  await start();
  act(() => button('Guard · 2 left').click());
  expect(host.textContent).toContain('Practice only: no damage');
  type('!!!' + prompt());
  expect(host.querySelector('[data-feedback="guard"]')).not.toBeNull();
  expect(host.querySelector('[aria-label="Partner HP"]')!.getAttribute('aria-valuenow')).toBe(
    '100',
  );
  expect(player.play).toHaveBeenCalledWith({ cue: 'guard', damage: 0, counter: 0 }, 'ember');
});
it('labels already-active legacy encounters instead of promising damage-free clean turns', async () => {
  (prepareTrailEncounter as jest.Mock).mockResolvedValue({
    ...collection,
    active: { ...encounter, rulesVersion: undefined },
  });
  await start();
  expect(host.textContent).toContain('Original encounter: opponent responds each turn');
  type(prompt());
  expect(host.querySelector('[aria-label="Partner HP"]')!.getAttribute('aria-valuenow')).toBe('88');
});
it('pauses sound with typing focus and reports unavailable audio without blocking play', async () => {
  player.unlock.mockResolvedValue(false);
  await act(async () => button('Sound off').click());
  expect(host.textContent).toContain('Sound is unavailable here');
  const input = await start();
  act(() => input.blur());
  expect(player.pause).toHaveBeenCalled();
  act(() => input.focus());
  type(prompt());
  expect(host.querySelector('[aria-label="Opponent HP"]')!.getAttribute('aria-valuenow')).toBe(
    '72',
  );
});
