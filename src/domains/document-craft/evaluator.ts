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

  if (task.requiredBlock) {
    const blockFound = new RegExp(`<${task.requiredBlock}[^>]*>[\\s\\S]*?${task.targetText}[\\s\\S]*?</${task.requiredBlock}>`, 'i').test(normalized);
    if (blockFound) completedChecks.push(`${task.requiredBlock} style applied`);
    else missingChecks.push(`Format “${task.targetText}” as ${task.requiredBlock.toUpperCase()}.`);
  }

  if (task.requiredList) {
    const tag = task.requiredList === 'ordered' ? 'ol' : 'ul';
    if (new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`, 'i').test(normalized)) completedChecks.push(`${task.requiredList} list created`);
    else missingChecks.push(`Create a ${task.requiredList} list.`);
  }

  return { passed: missingChecks.length === 0, completedChecks, missingChecks };
}
