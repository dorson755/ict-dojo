import type { DocumentTask } from './types';

export interface DocumentProject {
  id: string;
  title: string;
  description: string;
  task: DocumentTask;
  initialDocument: string;
}

export const DOCUMENT_PROJECTS: DocumentProject[] = [
  {
    id: 'weekly-plan',
    title: 'Professional weekly plan',
    description: 'Format a polished schedule with structure, a table, and a notes section.',
    task: {
      id: 'professional-weekly-plan',
      title: 'Build a professional weekly plan',
      instructions: 'Format the title as Heading 1, turn the topics into a bulleted list, insert a schedule table, and add a page break for the notes section.',
      targetText: 'My ICT Study Plan',
      requiredBlock: 'h1',
      requiredList: 'unordered',
      requiredTable: true,
      requiredPageBreak: true,
    },
    initialDocument: '<p>My ICT Study Plan</p><p>Keyboard fundamentals</p><p>Document formatting</p><p>Python practice</p><p>Notes and reflections</p>',
  },
  {
    id: 'research-brief',
    title: 'Research brief',
    description: 'Create a source-aware brief with a citation, footnote, and two-column reading layout.',
    task: {
      id: 'research-brief',
      title: 'Add professional document detail',
      instructions: 'Format the title as Heading 1, insert a footnote, add a citation, switch the document to two columns, and record one tracked change.',
      targetText: 'Digital Skills in Practice',
      requiredBlock: 'h1',
      requiredFootnote: true,
      requiredCitation: true,
      requiredColumns: 2,
      requiredTrackedChange: true,
    },
    initialDocument: '<p>Digital Skills in Practice</p><p>Clear document structure helps readers find, understand, and trust information.</p><p>Use this brief to explain one digital skill and support the explanation with a source.</p>',
  },
];
