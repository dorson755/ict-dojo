import type { DocumentEvaluation, DocumentMark, DocumentTask } from './types';

const markTags: Record<DocumentMark, string[]> = {
  bold: ['strong', 'b'],
  italic: ['em', 'i'],
  underline: ['u'],
  subscript: ['sub'],
  superscript: ['sup'],
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function extractText(html: string): string {
  return normalizeWhitespace(html.replace(/<[^>]+>/g, ' '));
}

function hasMark(html: string, target: string, mark: DocumentMark): boolean {
  const normalizedTarget = normalizeWhitespace(target);
  return markTags[mark].some((tag) => new RegExp(`<${tag}[^>]*>[\\s\\S]*?${normalizedTarget}[\\s\\S]*?</${tag}>`, 'i').test(html));
}

function hasAnyMark(html: string, mark: DocumentMark): boolean {
  return markTags[mark].some((tag) => new RegExp(`<${tag}[^>]*>[\\s\\S]*?\\S[\\s\\S]*?</${tag}>`, 'i').test(html));
}

function hasBlock(html: string, tag: string, target: string): boolean {
  const normalizedTarget = normalizeWhitespace(target);
  return new RegExp(`<${tag}[^>]*>[\\s\\S]*?${normalizedTarget}[\\s\\S]*?</${tag}>`, 'i').test(html);
}

function hasAnyBlock(html: string, tag: string): boolean {
  return new RegExp(`<${tag}[^>]*>[\\s\\S]*?\\S[\\s\\S]*?</${tag}>`, 'i').test(html);
}

export function evaluateDocument(html: string, task: DocumentTask): DocumentEvaluation {
  const completedChecks: string[] = [];
  const missingChecks: string[] = [];
  const normalized = normalizeWhitespace(html);
  const plainText = extractText(normalized);

  for (const mark of task.requiredMarks ?? []) {
    if (hasMark(normalized, task.targetText, mark) || hasAnyMark(normalized, mark)) {
      completedChecks.push(`${mark} applied`);
    } else {
      missingChecks.push(`Apply ${mark} to “${task.targetText}”.`);
    }
  }

  if (task.requiredAlignment) {
    const aligned = new RegExp(`text-align\\s*:\\s*${task.requiredAlignment}`, 'i').test(normalized)
      || new RegExp(`<[^>]+align=["']${task.requiredAlignment}["']`, 'i').test(normalized);
    if (aligned) completedChecks.push(`${task.requiredAlignment} alignment applied`);
    else missingChecks.push(`Set the target paragraph to ${task.requiredAlignment} alignment.`);
  }

  if (task.requiredBlock) {
    const exactBlock = hasBlock(normalized, task.requiredBlock, task.targetText);
    const anyBlock = hasAnyBlock(normalized, task.requiredBlock);
    const targetStillPresent = plainText.includes(normalizeWhitespace(task.targetText));
    if (exactBlock || (anyBlock && !targetStillPresent)) {
      completedChecks.push(`${task.requiredBlock} style applied`);
    } else {
      missingChecks.push(`Format “${task.targetText}” as ${task.requiredBlock.toUpperCase()}.`);
    }
  }

  if (task.requiredList) {
    const tag = task.requiredList === 'ordered' ? 'ol' : 'ul';
    if (new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`, 'i').test(normalized)) completedChecks.push(`${task.requiredList} list created`);
    else missingChecks.push(`Create a ${task.requiredList} list.`);
  }

  if (task.requiredTable) {
    if (/<table[\s\S]*<\/table>/i.test(normalized)) completedChecks.push('table inserted');
    else missingChecks.push('Insert a table for the document data.');
  }

  if (task.requiredPageBreak) {
    if (/<hr[^>]*(data-page-break|page-break)[^>]*>/i.test(normalized) || /page-break-after\s*:\s*always/i.test(normalized)) completedChecks.push('page break inserted');
    else missingChecks.push('Insert a page break before the next section.');
  }

  if (task.requiredFootnote) {
    if (/<(sup|aside)[^>]*(data-footnote|footnote)[^>]*>/i.test(normalized)) completedChecks.push('footnote inserted');
    else missingChecks.push('Insert a footnote for the supporting detail.');
  }

  if (task.requiredCitation) {
    if (/<[^>]*(data-citation|citation)[^>]*>/i.test(normalized)) completedChecks.push('citation inserted');
    else missingChecks.push('Insert a citation for the source.');
  }

  if (task.requiredColumns) {
    if (new RegExp(`column-count\\s*:\\s*${task.requiredColumns}`, 'i').test(normalized)) completedChecks.push(`${task.requiredColumns}-column layout applied`);
    else missingChecks.push(`Apply a ${task.requiredColumns}-column layout.`);
  }

  if (task.requiredTrackedChange) {
    if (/data-change=["'](inserted|deleted)["']/i.test(normalized)) completedChecks.push('tracked change recorded');
    else missingChecks.push('Turn on tracking and record a change.');
  }

  return { passed: missingChecks.length === 0, completedChecks, missingChecks };
}
