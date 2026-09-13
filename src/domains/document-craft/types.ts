export type DocumentMark = 'bold' | 'italic' | 'underline' | 'subscript' | 'superscript';
export type DocumentAlignment = 'left' | 'center' | 'right' | 'justify';
export type DocumentList = 'ordered' | 'unordered';

export interface DocumentTask {
  id: string;
  title: string;
  instructions: string;
  targetText: string;
  requiredMarks?: DocumentMark[];
  requiredAlignment?: DocumentAlignment;
  requiredBlock?: 'h1' | 'h2' | 'p';
  requiredList?: DocumentList;
  requiredTable?: boolean;
  requiredPageBreak?: boolean;
  requiredFootnote?: boolean;
  requiredCitation?: boolean;
  requiredColumns?: number;
  requiredTrackedChange?: boolean;
}

export interface DocumentEvaluation {
  passed: boolean;
  completedChecks: string[];
  missingChecks: string[];
}
