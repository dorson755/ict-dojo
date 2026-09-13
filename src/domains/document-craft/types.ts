export type DocumentMark = 'bold' | 'italic' | 'underline' | 'subscript' | 'superscript';
export type DocumentAlignment = 'left' | 'center' | 'right' | 'justify';

export interface DocumentTask {
  id: string;
  title: string;
  instructions: string;
  targetText: string;
  requiredMarks?: DocumentMark[];
  requiredAlignment?: DocumentAlignment;
}

export interface DocumentEvaluation {
  passed: boolean;
  completedChecks: string[];
  missingChecks: string[];
}
