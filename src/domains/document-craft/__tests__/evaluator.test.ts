import { evaluateDocument } from '../evaluator';
import type { DocumentTask } from '../types';

const task: DocumentTask = {
  id: 'advanced-report',
  title: 'Emphasize',
  instructions: 'Format the target.',
  targetText: 'My ICT Study Plan',
  requiredBlock: 'h1',
  requiredList: 'unordered',
  requiredTable: true,
  requiredPageBreak: true,
  requiredFootnote: true,
  requiredCitation: true,
  requiredColumns: 2,
  requiredTrackedChange: true,
};

describe('Document Craft evaluator', () => {
  it('passes when required marks wrap the target text', () => {
    const result = evaluateDocument('<h1>My ICT Study Plan</h1><ul><li>Keyboard</li></ul><table><tr><td>Plan</td></tr></table><hr data-page-break="true"><sup data-footnote="true">[1]</sup><span data-citation="true">[Source]</span><div style="column-count: 2"><mark data-change="inserted">new</mark></div>', task);
    expect(result.passed).toBe(true);
    expect(result.missingChecks).toHaveLength(0);
  });

  it('reports each missing formatting requirement', () => {
    const result = evaluateDocument('<p>My ICT Study Plan</p><p>Keyboard</p>', task);
    expect(result.passed).toBe(false);
    expect(result.missingChecks).toEqual([
      'Format “My ICT Study Plan” as H1.',
      'Create a unordered list.',
      'Insert a table for the document data.',
      'Insert a page break before the next section.',
      'Insert a footnote for the supporting detail.',
      'Insert a citation for the source.',
      'Apply a 2-column layout.',
      'Turn on tracking and record a change.',
    ]);
  });
});
