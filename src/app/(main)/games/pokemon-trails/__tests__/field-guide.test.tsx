/** @jest-environment jsdom */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import TrailsClient from '../TrailsClient';
import type { PokemonCollection } from '@/domains/typing/pokemon';

jest.mock('../trails.module.css', () => ({}));
jest.mock('../actions', () => ({
  changeTrailPartner: jest.fn(),
  chooseTrailStarter: jest.fn(),
  finishTrailEncounter: jest.fn(),
  leaveTrailEncounter: jest.fn(),
  prepareTrailEncounter: jest.fn(),
}));

const collection: PokemonCollection = {
  version: 1,
  partner: 'pikachu',
  caught: { bulbasaur: 4, pikachu: 6, mew: 20 },
  wins: 30,
  guardian: true,
  rewardDay: '',
  rewardsToday: 0,
};
let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(<TrailsClient initialCollection={collection} />));
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});
function guide() {
  return [...host.querySelectorAll('section')].find((section) =>
    section.textContent?.includes('Your field guide'),
  )!;
}
function search(value: string) {
  const input = host.querySelector<HTMLInputElement>('input[type="search"]')!;
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
it('counts only genuinely discovered forms across variable-length lines', () => {
  expect(guide().textContent).toMatch(/5\s*\/ 151/);
  expect(guide().querySelectorAll('img')).toHaveLength(151);
  expect(host.querySelector('img[alt="Raichu"]')).not.toBeNull();
  expect(host.querySelector('img[alt="Venusaur"]')).toBeNull();
  expect(guide().textContent).toContain('5 more encounters to evolve');
  expect(guide().textContent).toContain('Single form');
});
it('finds families by evolved names and shows an actionable empty state', () => {
  search('RAICHU');
  expect(guide().querySelectorAll('img')).toHaveLength(2);
  expect(guide().querySelector('img[alt="Raichu"]')).not.toBeNull();
  search('not a pokemon');
  expect(guide().querySelectorAll('img')).toHaveLength(0);
  expect(guide().querySelector('[role="status"]')?.textContent).toContain('No matching Pokémon');
});
it('filters to owned families and combines that filter with name search', () => {
  act(() => host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
  expect(guide().querySelectorAll('img')).toHaveLength(6);
  search('mew');
  expect(guide().querySelectorAll('img')).toHaveLength(1);
  expect(guide().querySelector('img')?.alt).toBe('Mew');
});
