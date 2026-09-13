import type { DocumentEvaluation, DocumentMark, DocumentTask } from './types';

const markTags: Record<DocumentMark, string[]> = {
  bold: ['strong', 'b'],
  italic: ['em', 'i'],
  underline: ['u'],
  subscript: ['sub'],
  superscript: ['sup'],
};

function hasMark(html: string, target: string, mark: DocumentMark): boolean {
  return markTags[mark].some((tag) => new RegExp(`<${tag}[^>]*>[\\s\\S]*?${target}[\\s\\S]*?</${tag}>`, 'i').test(html));
}

export function evaluateDocument(html: string, task: DocumentTask): DocumentEvaluation {
  const completedChecks: string[] = [];
  const missingChecks: string[] = [];
  const normalized = html.replace(/\s+/g, ' ');

  for (const mark of task.requiredMarks ?? []) {
    if (hasMark(normalized, task.targetText, mark)) completedChecks.push(`${mark} applied`);
    else missingChecks.push(`Apply ${mark} to “${task.targetText}”.`);
  }

  if (task.requiredAlignment) {
    const aligned = new RegExp(`text-align\\s*:\\s*${task.requiredAlignment}`, 'i').test(normalized)
      || new RegExp(`<[^>]+align=["']${task.requiredAlignment}["']`, 'i').test(normalized);
    if (aligned) completedChecks.push(`${task.requiredAlignment} alignment applied`);
    else missingChecks.push(`Set the target paragraph to ${task.requiredAlignment} alignment.`);
  }

  return { passed: missingChecks.length === 0, completedChecks, missingChecks };
}
