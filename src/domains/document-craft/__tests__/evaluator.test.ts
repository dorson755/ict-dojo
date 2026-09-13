import { evaluateDocument } from '../evaluator';
import type { DocumentTask } from '../types';

const task: DocumentTask = {
  id: 'bold-underline',
  title: 'Emphasize',
  instructions: 'Format the target.',
  targetText: 'ICT Dojo',
  requiredMarks: ['bold', 'underline'],
};

describe('Document Craft evaluator', () => {
  it('passes when required marks wrap the target text', () => {
    const result = evaluateDocument('<p><strong><u>ICT Dojo</u></strong> builds skills.</p>', task);
    expect(result.passed).toBe(true);
    expect(result.missingChecks).toHaveLength(0);
  });

  it('reports each missing formatting requirement', () => {
    const result = evaluateDocument('<p>ICT Dojo builds skills.</p>', task);
    expect(result.passed).toBe(false);
    expect(result.missingChecks).toEqual([
      'Apply bold to “ICT Dojo”.',
      'Apply underline to “ICT Dojo”.',
    ]);
  });
});
