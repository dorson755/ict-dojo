jest.mock('../client', () => ({
  GROQ_MODELS: { FAST: 'test-model' },
  getGroqClient: jest.fn(),
}));
jest.mock('@/lib/aws/repositories/ai-word-cache.repository', () => ({
  AiWordCacheRepository: { get: jest.fn(), put: jest.fn() },
}));
import { getGroqClient } from '../client';
import { generateQuestContent } from '../quest-generator';
import { AiWordCacheRepository } from '@/lib/aws/repositories/ai-word-cache.repository';
import { fallbackQuestContent, QUEST_STAGES } from '@/domains/typing/quest';

const cache = AiWordCacheRepository as jest.Mocked<typeof AiWordCacheRepository>;
function modelReturns(content: string) {
  const create = jest.fn().mockResolvedValue({ choices: [{ message: { content } }] });
  (getGroqClient as jest.Mock).mockReturnValue({ chat: { completions: { create } } });
  return create;
}
const fresh = () => new Date().toISOString();

beforeEach(() => {
  jest.resetAllMocks();
  cache.get.mockResolvedValue(null);
  cache.put.mockResolvedValue();
});

it('labels valid model output as AI and stores it in the chosen slot', async () => {
  const payload = fallbackQuestContent(QUEST_STAGES[0], {});
  modelReturns(JSON.stringify(payload));
  const result = await generateQuestContent(QUEST_STAGES[0], {}, { rand: () => 0.99 });
  expect(result.source).toBe('ai');
  expect(cache.get).toHaveBeenCalledWith('v2#scroll#belt0#-#2');
  expect(cache.put).toHaveBeenCalledWith('v2#scroll#belt0#-#2', result);
});

it.each([0, 7, 23.99])(
  'serves a valid %s-hour-old cached list without calling the model',
  async (hours) => {
    const payload = fallbackQuestContent(QUEST_STAGES[0], { i: 3 });
    cache.get.mockResolvedValue({
      ...payload,
      created_at: new Date(Date.now() - hours * 3600_000).toISOString(),
    });
    const create = modelReturns('{}');
    const result = await generateQuestContent(QUEST_STAGES[0], { i: 3 }, { rand: () => 0 });
    expect(result).toMatchObject({ source: 'ai', words: payload.words, focusKeys: ['i'] });
    expect(cache.get).toHaveBeenCalledWith('v2#scroll#belt0#i#0');
    expect(create).not.toHaveBeenCalled();
  },
);

it('regenerates stale or invalid cached lists, and survives storage errors', async () => {
  const payload = fallbackQuestContent(QUEST_STAGES[0], {});
  const stale = new Date(Date.now() - 24 * 3600_000).toISOString();
  for (const stored of [
    { ...payload, created_at: stale },
    { ...payload, created_at: new Date(Date.now() + 3600_000).toISOString() },
    { ...payload, created_at: 'invalid date' },
    { words: ['<script>'], bossLine: payload.bossLine, created_at: fresh() },
  ]) {
    cache.get.mockResolvedValue(stored);
    const create = modelReturns(JSON.stringify(payload));
    expect((await generateQuestContent(QUEST_STAGES[0], {})).source).toBe('ai');
    expect(create).toHaveBeenCalledTimes(1);
  }
  cache.get.mockRejectedValue(new Error('DynamoDB down'));
  cache.put.mockRejectedValue(new Error('DynamoDB down'));
  modelReturns(JSON.stringify(payload));
  expect((await generateQuestContent(QUEST_STAGES[0], {})).source).toBe('ai');
});

it('words-only mode skips the scroll, uses the stage scroll, and caches separately', async () => {
  for (const stage of QUEST_STAGES) {
    const { words } = fallbackQuestContent(stage, {});
    const create = modelReturns(JSON.stringify({ words }));
    const result = await generateQuestContent(stage, {}, { scroll: false, rand: () => 0 });
    expect(result).toMatchObject({ source: 'ai', bossLine: stage.scroll });
    const prompt: string = create.mock.calls[0][0].messages[0].content;
    expect(prompt).not.toMatch(/scroll/i);
    expect(cache.put).toHaveBeenLastCalledWith(`v2#words#belt${stage.belt}#-#0`, result);
  }
});

it('splits the stage vocabulary into weak-key and other words for the model', async () => {
  const create = modelReturns('{}');
  await generateQuestContent(QUEST_STAGES[0], { i: 3 });
  const prompt: string = create.mock.calls[0][0].messages[0].content;
  const listA = prompt.match(/List A: (.*)/)![1].split(', ');
  const listB = prompt.match(/List B: (.*)/)![1].split(', ');
  expect(listA.length).toBeGreaterThan(14);
  expect(listA.every((word) => word.includes('i'))).toBe(true);
  expect(listB.some((word) => word.includes('i'))).toBe(false);
  expect(create.mock.calls[0][0].max_tokens).toBeGreaterThanOrEqual(2000);
});

it.each(['not json', '{}', '{"words":["asdf"],"bossLine":"no"}'])(
  'rejects malformed or poor output without caching it: %s',
  async (raw) => {
    modelReturns(raw);
    expect((await generateQuestContent(QUEST_STAGES[0], {})).source).toBe('fallback');
    expect(cache.put).not.toHaveBeenCalled();
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
