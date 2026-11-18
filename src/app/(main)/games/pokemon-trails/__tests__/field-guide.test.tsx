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
    section.textContent?.includes('Pokédex'),
  )!;
}
function search(value: string) {
  const input = host.querySelector<HTMLInputElement>('input[type="search"]')!;
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
it('shows a numbered 20-entry page and keeps undiscovered forms hidden', () => {
  expect(guide().textContent).toMatch(/5\s*\/ 151/);
  expect(guide().querySelectorAll('ol[aria-label="Pokédex entries"] li')).toHaveLength(20);
  expect(guide().querySelector('button[aria-label*="#001, Bulbasaur"]')).not.toBeNull();
  expect(guide().querySelector('button[aria-label*="#003, undiscovered Pokémon"]')).not.toBeNull();
  expect(guide().querySelector('h3')?.textContent).toBe('Bulbasaur');
  expect(guide().querySelector('ol[aria-label="Evolution line"]')?.textContent).toContain('???');
  act(() => {
    [...guide().querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Next'))
      ?.click();
  });
  expect(guide().querySelectorAll('ol[aria-label="Pokédex entries"] li')).toHaveLength(20);
  expect(guide().querySelector('button[aria-label*="#026, Raichu"]')).not.toBeNull();
  for (let page = 0; page < 6; page++) {
    act(() => {
      [...guide().querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent?.includes('Next'))
        ?.click();
    });
  }
  expect(guide().querySelectorAll('ol[aria-label="Pokédex entries"] li')).toHaveLength(11);
  expect(guide().querySelector('button[aria-label*="#151, Mew"]')).not.toBeNull();
  expect(guide().textContent).toContain('Page 8 of 8');
});
it('finds families by evolved names and shows an actionable empty state', () => {
  search('RAICHU');
  expect(guide().querySelectorAll('ol[aria-label="Pokédex entries"] li')).toHaveLength(1);
  expect(guide().querySelector('button[aria-label*="#026, Raichu"]')).not.toBeNull();
  expect(guide().querySelector('h3')?.textContent).toBe('Raichu');
  search('not a pokemon');
  expect(guide().querySelectorAll('ol[aria-label="Pokédex entries"] li')).toHaveLength(0);
  expect(guide().querySelector('[role="status"]')?.textContent).toContain('No matching Pokémon');
});
it('filters to discovered species and combines that filter with name search', () => {
  act(() => host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
  expect(guide().querySelectorAll('ol[aria-label="Pokédex entries"] li')).toHaveLength(5);
  search('mew');
  expect(guide().querySelectorAll('ol[aria-label="Pokédex entries"] li')).toHaveLength(1);
  expect(guide().querySelector('button[aria-label*="#151, Mew"]')).not.toBeNull();
  expect(
    [...guide().querySelectorAll('button')].some((button) => button.textContent === 'Make partner'),
  ).toBe(true);
});
