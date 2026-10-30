import { getBeltName } from '@/domains/shared/belt-names';
import { GAME_WORDS, pickGameWords, topWeakChars } from './word-bank';

export interface QuestStage {
  belt: number;
  name: string;
  setting: 'courtyard' | 'forest' | 'village' | 'temple';
  boss: string;
  minWord: number;
  maxWord: number;
  waveSize: number;
  speed: number;
  scroll: string;
}

const settings = ['courtyard', 'forest', 'village', 'temple'] as const;
const names = ['Courtyard', 'Bamboo Forest', 'Lantern Village', 'Mountain Temple'];
const bosses = ['Giant Bamboo', 'Bamboo Guardian', 'Blue Tengu', 'Red Samurai'];
const scrolls = [
  'calm hands can find the way',
  'keep your focus and guard the gate',
  'steady hands guide the brave student',
  'practice each day and return with balance',
  'Focus your mind. Let each strike find its mark.',
  'Keep your rhythm, student. Precision opens the gate!',
  'Complete 3 rounds, then return to the temple.',
  'Precision + practice = progress. Complete 10 rounds!',
];

export const QUEST_STAGES: QuestStage[] = Array.from({ length: 8 }, (_, belt) => ({
  belt,
  name: names[Math.floor(belt / 2)],
  setting: settings[Math.floor(belt / 2)],
  boss: bosses[Math.floor(belt / 2)],
  minWord: [3, 4, 4, 5, 5, 6, 7, 8][belt],
  maxWord: [4, 5, 6, 7, 8, 9, 9, 9][belt],
  waveSize: 12 + Math.floor(belt / 2) * 2,
  speed: 0.65 + belt * 0.055,
  scroll: scrolls[belt],
}));

export interface QuestContent {
  words: string[];
  bossLine: string;
  source: 'ai' | 'fallback';
  focusKeys: string[];
}

export function questStage(belt: number): QuestStage | undefined {
  return Number.isInteger(belt) && belt >= 0 && belt < QUEST_STAGES.length
    ? QUEST_STAGES[belt]
    : undefined;
}

export function canEnterStage(earnedBelt: number, stageBelt: number): boolean {
  return !!questStage(stageBelt) && Number.isFinite(earnedBelt) && earnedBelt >= stageBelt;
}

export function stageVocabulary(stage: QuestStage): string[] {
  return GAME_WORDS.filter((word) => word.length >= stage.minWord && word.length <= stage.maxWord);
}

/** Only send non-identifying, in-level letter targets to the model. */
export function questFocusKeys(stage: QuestStage, weakKeys: Record<string, number>): string[] {
  const vocabulary = stageVocabulary(stage);
  return topWeakChars(weakKeys, 20)
    .map((key) => key.toLowerCase())
    .filter(
      (key, i, keys) =>
        /^[a-z]$/.test(key) &&
        keys.indexOf(key) === i &&
        vocabulary.some((word) => word.includes(key)),
    )
    .slice(0, 3);
}

export function fallbackQuestContent(
  stage: QuestStage,
  weakKeys: Record<string, number>,
): QuestContent {
  return {
    words: pickGameWords(weakKeys, 24, { pool: stageVocabulary(stage) }),
    bossLine: stage.scroll,
    source: 'fallback',
    focusKeys: questFocusKeys(stage, weakKeys),
  };
}

/**
 * AI chooses from a child-safe dictionary, not arbitrary invented words.
 * Scrolls must be bounded, printable, and match the tier's keyboard skills.
 */
export function validateQuestContent(
  raw: unknown,
  stage: QuestStage,
  focusKeys: string[],
): QuestContent | null {
  if (!raw || typeof raw !== 'object') return null;
  const { words, bossLine } = raw as Record<string, unknown>;
  if (
    !Array.isArray(words) ||
    words.length < 16 ||
    words.length > 32 ||
    !words.every((word) => typeof word === 'string')
  )
    return null;
  const vocabulary = new Set(stageVocabulary(stage));
  const unique = [...new Set(words as string[])];
  if (unique.length < 16 || unique.some((word) => !vocabulary.has(word))) return null;
  if (
    focusKeys.length &&
    unique.filter((word) => focusKeys.some((key) => word.includes(key))).length <
      Math.ceil(unique.length * 0.6)
  )
    return null;
  if (
    typeof bossLine !== 'string' ||
    bossLine.length < 24 ||
    bossLine.length > 100 ||
    bossLine !== bossLine.trim() ||
    /\s{2}|[^\x20-\x7e]/.test(bossLine)
  )
    return null;
  const allowed =
    stage.belt < 4 ? /^[a-z ]+$/ : stage.belt < 6 ? /^[a-zA-Z .,!?']+$/ : /^[a-zA-Z0-9 .,!?'+=]+$/;
  if (!allowed.test(bossLine)) return null;
  // A narrow scroll vocabulary keeps model output classroom-safe and on theme.
  const safe = new Set([
    ...GAME_WORDS,
    ...(scrolls
      .join(' ')
      .toLowerCase()
      .match(/[a-z]+/g) ?? []),
  ]);
  const tokens = bossLine.toLowerCase().match(/[a-z]+/g) ?? [];
  if (tokens.length < 5 || tokens.some((word) => !safe.has(word as (typeof GAME_WORDS)[number])))
    return null;
  if (stage.belt >= 4 && (!/[A-Z]/.test(bossLine) || !/[.!?,]/.test(bossLine))) return null;
  if (stage.belt >= 6 && !/\d/.test(bossLine)) return null;
  if (stage.belt === 7 && !/[+=]/.test(bossLine)) return null;
  return { words: unique, bossLine, source: 'ai', focusKeys };
}

export function stageTitle(stage: QuestStage): string {
  return `${getBeltName(stage.belt)} belt: ${stage.name}`;
}
