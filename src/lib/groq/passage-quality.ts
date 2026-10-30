/**
 * Quality gate for AI-generated typing passages.
 *
 * A model can answer with a refusal, a preamble, markdown, or a passage that
 * never uses the characters we asked for. Callers treat a failed check as
 * "do not use this text" and fall back to the local generator, labeled as a
 * fallback so nothing claims to be AI-generated when it is not.
 */

export interface PassageQuality {
  ok: boolean;
  /** Fraction of the required characters that appear at least once. */
  coverage: number;
  reasons: string[];
}

/** Strips the wrappers models commonly add around the requested text. */
export function sanitizePassage(raw: string): string {
  let text = raw.trim();

  // Markdown code fences: ```html ... ``` or ``` ... ```
  const fenced = text.match(/^```[a-zA-Z]*\s*\n([\s\S]*?)\n?```$/);
  if (fenced) text = fenced[1].trim();

  // Surrounding quotes
  if (text.length >= 2 && ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'")))) {
    text = text.slice(1, -1).trim();
  }

  // A single preamble line such as "Here is your passage:" before real text.
  const preamble = text.match(/^(?:here (?:is|'s)[^\n]*|sure[^\n]*)\n+/i);
  if (preamble && text.slice(preamble[0].length).trim().length >= 40) {
    text = text.slice(preamble[0].length).trim();
  }

  return text;
}

/** Whitespace targets are meaningless: nearly every passage contains a space. */
function meaningfulTargets(requiredCharacters: string[]): string[] {
  return [...new Set(requiredCharacters.filter((char) => char.trim().length > 0))];
}

export function assessPassage(
  passage: string,
  requiredCharacters: string[],
  lengthMin: number,
  lengthMax: number
): PassageQuality {
  const reasons: string[] = [];
  const text = passage.trim();

  if (!text) return { ok: false, coverage: 0, reasons: ['empty'] };

  // Too short means a refusal, a fragment, or reasoning text instead of a passage.
  if (text.length < Math.ceil(lengthMin * 0.5)) reasons.push('too-short');
  // Wildly over budget means the model ignored the exercise constraints.
  if (text.length > lengthMax * 4) reasons.push('too-long');

  const targets = meaningfulTargets(requiredCharacters);
  const present = targets.filter((char) => text.includes(char)).length;
  const coverage = targets.length === 0 ? 1 : present / targets.length;
  // The model may miss one odd symbol; missing most means the drill targets nothing.
  if (targets.length > 0 && coverage < 0.6) reasons.push('missing-targets');

  return { ok: reasons.length === 0, coverage, reasons };
}
