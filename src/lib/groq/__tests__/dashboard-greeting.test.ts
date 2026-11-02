jest.mock('../client', () => ({
  GROQ_MODELS: { FAST: 'test-model' },
  getGroqClient: jest.fn(),
}));

import { getGroqClient } from '../client';
import { ContentGenerator } from '../content-generator';

beforeEach(() => jest.clearAllMocks());

afterEach(() => {
  expect(getGroqClient).not.toHaveBeenCalled();
});

it('personalizes the greeting with the learner, streak, and weak keys locally', async () => {
  const result = await ContentGenerator.generateDashboardGreeting('Ada', ['a', 's'], 3);
  expect(result).toContain('Welcome back, Ada');
  expect(result).toContain('3-day streak');
  expect(result).toContain('A, S keys');
});

it('offers a general accuracy challenge when there are no weak keys or streak', async () => {
  const result = await ContentGenerator.generateDashboardGreeting('Ada', [], 0);
  expect(result).toContain('build your rhythm');
  expect(result).toContain('accuracy before speed');
  expect(result).not.toContain('streak');
});

it('normalizes and limits key labels, including Space and punctuation', async () => {
  const result = await ContentGenerator.generateDashboardGreeting(
    'Ada',
    ['a', 'A', ' ', ';', 's', 'Enter', '\n'],
    1,
  );
  expect(result).toContain('A, Space, ; keys');
  expect(result).not.toContain('Enter');
  expect(result).toContain('1-day streak');
});

it('uses singular key wording and a fallback for an empty name', async () => {
  const result = await ContentGenerator.generateDashboardGreeting('  ', ['f'], 0);
  expect(result).toContain('Welcome back, Learner');
  expect(result).toContain('F key with');
});

it.each([-1, NaN, Infinity])('ignores an invalid streak of %s', async (streak) => {
  const result = await ContentGenerator.generateDashboardGreeting('Ada', [], streak);
  expect(result).not.toContain('streak');
});
