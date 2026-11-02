import { getGroqClient, GROQ_MODELS } from './client';
import { AiWordCacheRepository } from '@/lib/aws/repositories/ai-word-cache.repository';
import {
  fallbackQuestContent,
  questFocusKeys,
  stageVocabulary,
  validateQuestContent,
} from '@/domains/typing/quest';
import type { QuestStage, QuestContent } from '@/domains/typing/quest';

/** Bump when the prompt changes so older cached lists stop being served. */
const PROMPT_VERSION = 2;
const CACHE_SLOTS = 3;
// Daily reuse preserves the three variants without regenerating them every six hours.
const CACHE_HOURS = 24;

export interface GenerateOptions {
  /** Games without a boss scroll skip it: fewer tokens and fewer rejected lists. */
  scroll?: boolean;
  rand?: () => number;
}

function prompt(stage: QuestStage, focus: string[], scroll: boolean): string {
  const vocabulary = stageVocabulary(stage);
  const focusWords = vocabulary.filter((word) => focus.some((key) => word.includes(key)));
  const otherWords = vocabulary.filter((word) => !focusWords.includes(word));
  // Pre-split lists make the 60% weak-key quota a counting task for the model,
  // instead of letter checks it frequently gets wrong.
  // Higher belts have small vocabularies (Black has 19 words); asking for more
  // unique words than exist makes the model refuse.
  const count = Math.min(20, vocabulary.length);
  const fromA = Math.min(focusWords.length, Math.ceil(count * 0.7));
  const lists = focus.length ? 'lists' : 'list';
  const wordRule = focus.length
    ? `Pick exactly ${count} UNIQUE words: at least ${fromA} from list A, the rest from list B.
List A: ${focusWords.join(', ')}
List B: ${otherWords.join(', ')}`
    : `Pick exactly ${count} UNIQUE words from this list: ${vocabulary.join(', ')}`;
  const scrollRules = scroll
    ? `Write a natural, encouraging boss scroll of 24-100 characters about practice and focus.
Every scroll word must appear in the ${lists} above or in this example: "${stage.scroll}". If unsure, use the example exactly.
${stage.belt < 4 ? 'Lowercase letters and single spaces only in the scroll.' : 'Include a capital letter and sentence punctuation in the scroll.'}
${stage.belt >= 6 ? 'Include a number in the scroll.' : ''}
${stage.belt === 7 ? 'Include + or = in the scroll.' : ''}`
    : '';
  return `Create a classroom-safe typing adventure in ${stage.name}.
Return JSON only: ${scroll ? '{"words":[...],"bossLine":"..."}' : '{"words":[...]}'}.
${wordRule}
Never use a word that is not in the ${lists} above, even a similar or longer word.
${scrollRules}
Do not include names, violence, explanations, or markdown.`;
}

/** Validates both model output and cached lists, so a stale schema can't slip through. */
function validate(
  raw: unknown,
  stage: QuestStage,
  focus: string[],
  scroll: boolean,
): QuestContent | null {
  if (!raw || typeof raw !== 'object') return null;
  // Words-only games never show a scroll; the stage's own scroll satisfies the shape.
  const candidate = scroll ? raw : { ...raw, bossLine: stage.scroll };
  return validateQuestContent(candidate, stage, focus);
}

export async function generateQuestContent(
  stage: QuestStage,
  weakKeys: Record<string, number>,
  { scroll = true, rand = Math.random }: GenerateOptions = {},
): Promise<QuestContent> {
  const focus = questFocusKeys(stage, weakKeys);
  // Students who share a belt and weak keys share lists. Several slots keep
  // rounds varied while capping model calls per combination.
  const slot = Math.floor(rand() * CACHE_SLOTS);
  const key = `v${PROMPT_VERSION}#${scroll ? 'scroll' : 'words'}#belt${stage.belt}#${[...focus].sort().join('') || '-'}#${slot}`;
  try {
    const cached = await AiWordCacheRepository.get(key);
    const age = cached ? Date.now() - Date.parse(cached.created_at) : NaN;
    if (cached && age >= 0 && age < CACHE_HOURS * 3600_000) {
      const content = validate(cached, stage, focus, scroll);
      if (content) return content;
    }
  } catch {
    // A storage problem only costs a model call.
  }
  try {
    const response = await getGroqClient().chat.completions.create(
      {
        model: GROQ_MODELS.FAST,
        reasoning_effort: 'low',
        temperature: 0.7,
        // Reasoning alone can use ~950 tokens; a lower cap truncates the JSON.
        max_tokens: 2500,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt(stage, focus, scroll) }],
      },
      { timeout: 12_000, maxRetries: 0 },
    );
    const content = validate(
      JSON.parse(response.choices[0]?.message?.content ?? ''),
      stage,
      focus,
      scroll,
    );
    if (content) {
      await AiWordCacheRepository.put(key, content).catch(() => {});
      return content;
    }
  } catch {
    // Missing credentials, timeout, rate limit, malformed JSON, or quality
    // failure all use the same honestly labeled, local weak-key word pool.
  }
  return fallbackQuestContent(stage, weakKeys);
}
