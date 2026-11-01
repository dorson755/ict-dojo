import { getGroqClient, GROQ_MODELS } from './client';
import {
  fallbackQuestContent,
  questFocusKeys,
  stageVocabulary,
  validateQuestContent,
} from '@/domains/typing/quest';
import type { QuestStage, QuestContent } from '@/domains/typing/quest';

export async function generateQuestContent(
  stage: QuestStage,
  weakKeys: Record<string, number>,
): Promise<QuestContent> {
  const focus = questFocusKeys(stage, weakKeys);
  const vocabulary = stageVocabulary(stage);
  const focusWords = vocabulary.filter((word) => focus.some((key) => word.includes(key)));
  const otherWords = vocabulary.filter((word) => !focusWords.includes(word));
  // Pre-split lists make the 60% weak-key quota a counting task for the model,
  // instead of letter checks it frequently gets wrong.
  // Higher belts have small vocabularies (Black has 19 words); asking for more
  // unique words than exist makes the model refuse.
  const count = Math.min(20, vocabulary.length);
  const fromA = Math.min(focusWords.length, Math.ceil(count * 0.7));
  const wordRule = focus.length
    ? `Pick exactly ${count} UNIQUE words: at least ${fromA} from list A, the rest from list B.
List A: ${focusWords.join(', ')}
List B: ${otherWords.join(', ')}`
    : `Pick exactly ${count} UNIQUE words from this list: ${vocabulary.join(', ')}`;
  try {
    const response = await getGroqClient().chat.completions.create(
      {
        model: GROQ_MODELS.FAST,
        reasoning_effort: 'low',
        temperature: 0.7,
        // Reasoning alone can use ~950 tokens; a lower cap truncates the JSON.
        max_tokens: 2500,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: `Create a classroom-safe typing adventure in ${stage.name}.
Return JSON only: {"words":[...],"bossLine":"..."}.
${wordRule}
Never use a word that is not in the list${focus.length ? 's' : ''} above, even a similar or longer word.
Write a natural, encouraging boss scroll of 24-100 characters about practice and focus.
Every scroll word must appear in the list${focus.length ? 's' : ''} above or in this example: "${stage.scroll}". If unsure, use the example exactly.
${stage.belt < 4 ? 'Lowercase letters and single spaces only in the scroll.' : 'Include a capital letter and sentence punctuation in the scroll.'}
${stage.belt >= 6 ? 'Include a number in the scroll.' : ''}
${stage.belt === 7 ? 'Include + or = in the scroll.' : ''}
Do not include names, violence, explanations, or markdown.`,
          },
        ],
      },
      { timeout: 12_000, maxRetries: 0 },
    );
    const content = validateQuestContent(
      JSON.parse(response.choices[0]?.message?.content ?? ''),
      stage,
      focus,
    );
    if (content) return content;
  } catch {
    // Missing credentials, timeout, malformed JSON, or quality failure all use
    // the same honestly labeled, local weak-key word pool.
  }
  return fallbackQuestContent(stage, weakKeys);
}
