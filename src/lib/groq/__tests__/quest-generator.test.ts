jest.mock('../client', () => ({
  GROQ_MODELS: { FAST: 'test-model' },
  getGroqClient: jest.fn(),
}));
import { getGroqClient } from '../client';
import { generateQuestContent } from '../quest-generator';
import { fallbackQuestContent, QUEST_STAGES } from '@/domains/typing/quest';

it('labels valid model output as AI', async () => {
  const payload = fallbackQuestContent(QUEST_STAGES[0], {});
  (getGroqClient as jest.Mock).mockReturnValue({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: JSON.stringify(payload) } }],
        }),
      },
    },
  });
  expect((await generateQuestContent(QUEST_STAGES[0], {})).source).toBe('ai');
});

it.each(['not json', '{}', '{"words":["asdf"],"bossLine":"no"}'])(
  'rejects malformed or poor output: %s',
  async (raw) => {
    (getGroqClient as jest.Mock).mockReturnValue({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: raw } }],
          }),
        },
      },
    });
    expect((await generateQuestContent(QUEST_STAGES[0], {})).source).toBe('fallback');
  },
);

it('falls back honestly when the model is unavailable', async () => {
  (getGroqClient as jest.Mock).mockImplementation(() => {
    throw new Error('Unavailable');
  });
  const result = await generateQuestContent(QUEST_STAGES[3], { e: 4 });
  expect(result.source).toBe('fallback');
  expect(result.focusKeys).toEqual(['e']);
});
