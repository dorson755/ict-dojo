'use client';

import { useRef, useState } from 'react';
import { evaluateDocument } from '@/domains/document-craft/evaluator';
import type { DocumentMark, DocumentTask } from '@/domains/document-craft/types';
import Link from 'next/link';
import { DOCUMENT_PROJECTS } from '@/domains/document-craft/projects';
import styles from './document-craft.module.css';
import { saveDocumentProject } from './actions';

const fallbackTask: DocumentTask = {
  id: 'advanced-report',
  title: 'Add professional document detail',
  instructions: 'Insert a footnote, add a citation, switch the document to two columns, and record one tracked change.',
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

const fallbackDocument = '<p>My ICT Study Plan</p><p>Keyboard fundamentals</p><p>Document formatting</p><p>Python practice</p><p>Notes and reflections</p>';

export default function DocumentCraftClient({ projectId }: { projectId?: string }) {
  const project = DOCUMENT_PROJECTS.find((item) => item.id === projectId);
  const task = project?.task ?? fallbackTask;
  const initialDocument = project?.initialDocument ?? fallbackDocument;
  const editorRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<{ passed: boolean; missingChecks: string[]; saved?: boolean } | null>(null);

  function apply(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
  }

  function evaluate() {
    if (!editorRef.current) return;
    const evaluation = evaluateDocument(editorRef.current.innerHTML, task);
    setResult(evaluation);
    if (evaluation.passed && editorRef.current) {
      void saveDocumentProject(project?.id ?? task.id, editorRef.current.innerHTML, true, evaluation.completedChecks)
        .then(() => setResult({ ...evaluation, saved: true }));
    }
  }

  function downloadDocument() {
    if (!editorRef.current) return;
    const blob = new Blob([`<!doctype html><html><body>${editorRef.current.innerHTML}</body></html>`], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${project?.id ?? 'document-craft'}.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const buttons: { label: string; command: string; mark?: DocumentMark }[] = [
    { label: 'B', command: 'bold', mark: 'bold' },
    { label: 'I', command: 'italic', mark: 'italic' },
    { label: 'U', command: 'underline', mark: 'underline' },
    { label: 'x₂', command: 'subscript', mark: 'subscript' },
    { label: 'x²', command: 'superscript', mark: 'superscript' },
  ];

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div><p className={styles.kicker}>Document craft / fundamentals</p><h1 className={styles.title}>Format with intention.</h1><p className={styles.subtitle}>Practice the document skills that make your work clear, polished, and professional.</p></div>
        <Link className={styles.level} href="/document-craft/projects">Projects</Link>
      </header>
      <div className={styles.workspace}>
        <aside className={styles.brief}>
          <p className={styles.briefLabel}>Current task</p>
          <h2>{task.title}</h2>
          <p>{task.instructions}</p>
          <div className={styles.rubric}><span>Required</span><strong>Footnote + citation + columns + tracked change</strong><small>Practice advanced document-production controls.</small></div>
          <button className={styles.checkButton} onClick={evaluate}>Check document</button>
          {result && <div className={result.passed ? styles.success : styles.feedback}>{result.passed ? `Task complete. Your formatting matches the rubric.${result.saved ? ' Saved to your portfolio.' : ''}` : result.missingChecks.join(' ')}</div>}
          <button className={styles.downloadButton} onClick={downloadDocument}>Download document</button>
          <Link className={styles.portfolioLink} href="/document-craft/portfolio">View portfolio</Link>
        </aside>
        <section className={styles.editorShell} aria-label="Document editor">
          <div className={styles.toolbar} role="toolbar" aria-label="Formatting toolbar">
            {buttons.map((button) => <button key={button.command} className={`${styles.toolButton} ${button.mark === 'bold' ? styles.bold : ''}`} onMouseDown={(event) => event.preventDefault()} onClick={() => apply(button.command)} aria-label={button.command}>{button.label}</button>)}
            <span className={styles.divider} />
            <select className={styles.formatSelect} defaultValue="" onChange={(event) => { if (event.target.value) apply('formatBlock', event.target.value); event.currentTarget.value = ''; }} aria-label="Paragraph style">
              <option value="">Style</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="p">Paragraph</option>
            </select>
            <button className={styles.toolButton} onMouseDown={(event) => event.preventDefault()} onClick={() => apply('insertUnorderedList')} aria-label="Bulleted list">•</button>
            <button className={styles.toolButton} onMouseDown={(event) => event.preventDefault()} onClick={() => apply('insertOrderedList')} aria-label="Numbered list">1.</button>
            <button className={styles.toolButton} onMouseDown={(event) => event.preventDefault()} onClick={() => apply('outdent')} aria-label="Decrease indent">←</button>
            <button className={styles.toolButton} onMouseDown={(event) => event.preventDefault()} onClick={() => apply('indent')} aria-label="Increase indent">→</button>
            <span className={styles.divider} />
            <button className={styles.toolButton} onMouseDown={(event) => event.preventDefault()} onClick={() => apply('insertHTML', '<table><tbody><tr><th>Day</th><th>Focus</th></tr><tr><td>Monday</td><td>Typing</td></tr><tr><td>Wednesday</td><td>Documents</td></tr></tbody></table>')} aria-label="Insert schedule table">▦</button>
            <button className={styles.toolButton} onMouseDown={(event) => event.preventDefault()} onClick={() => apply('insertHTML', '<hr data-page-break="true" />')} aria-label="Insert page break">↧</button>
            <button className={styles.toolButton} onMouseDown={(event) => event.preventDefault()} onClick={() => apply('insertHTML', '<sup data-footnote="true">[1]</sup><aside data-footnote-body="true"> Add source detail here.</aside>')} aria-label="Insert footnote">¹</button>
            <button className={styles.toolButton} onMouseDown={(event) => event.preventDefault()} onClick={() => apply('insertHTML', '<span data-citation="true">[Author, 2026]</span>')} aria-label="Insert citation">Cite</button>
            <button className={styles.toolButton} onMouseDown={(event) => { event.preventDefault(); if (editorRef.current) editorRef.current.style.columnCount = '2'; }} onClick={() => undefined} aria-label="Apply two columns">▥</button>
            <button className={styles.toolButton} onMouseDown={(event) => event.preventDefault()} onClick={() => apply('insertHTML', '<mark data-change="inserted">new text</mark>')} aria-label="Record tracked change">Track</button>
            {(['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'] as const).map((command) => <button key={command} className={styles.toolButton} onMouseDown={(event) => event.preventDefault()} onClick={() => apply(command)} aria-label={command}>{command === 'justifyLeft' ? '≡' : command === 'justifyCenter' ? '☷' : command === 'justifyRight' ? '≣' : '▤'}</button>)}
          </div>
          <div className={styles.paper} ref={editorRef} contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{ __html: initialDocument }} role="textbox" aria-label="Editable document" />
        </section>
      </div>
    </main>
  );
}
