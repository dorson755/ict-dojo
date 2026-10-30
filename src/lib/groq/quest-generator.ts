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
  try {
    const response = await getGroqClient().chat.completions.create(
      {
        model: GROQ_MODELS.FAST,
        reasoning_effort: 'low',
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: `Create a classroom-safe typing adventure in ${stage.name}.
Return JSON only: {"words":[...],"bossLine":"..."}.
Choose 16-24 UNIQUE words ONLY from this vocabulary: ${stageVocabulary(stage).join(', ')}.
${focus.length ? `At least 60% of words must contain one of these weak keys: ${focus.join(', ')}.` : 'Choose a varied mix of words.'}
Write a natural, encouraging boss scroll of 24-100 characters about practice and focus.
Use only simple words from the vocabulary or this example: "${stage.scroll}".
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
