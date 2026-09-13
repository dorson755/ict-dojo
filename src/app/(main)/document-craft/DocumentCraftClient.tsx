'use client';

import { useRef, useState } from 'react';
import { evaluateDocument } from '@/domains/document-craft/evaluator';
import type { DocumentMark, DocumentTask } from '@/domains/document-craft/types';
import styles from './document-craft.module.css';

const task: DocumentTask = {
  id: 'structured-study-plan',
  title: 'Build a clean study outline',
  instructions: 'Format the title as Heading 1, then select the three study topics and turn them into a bulleted list.',
  targetText: 'My ICT Study Plan',
  requiredBlock: 'h1',
  requiredList: 'unordered',
};

const initialDocument = '<p>My ICT Study Plan</p><p>Keyboard fundamentals</p><p>Document formatting</p><p>Python practice</p>';

export default function DocumentCraftClient() {
  const editorRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<{ passed: boolean; missingChecks: string[] } | null>(null);

  function apply(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
  }

  function evaluate() {
    if (!editorRef.current) return;
    const evaluation = evaluateDocument(editorRef.current.innerHTML, task);
    setResult(evaluation);
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
        <span className={styles.level}>Mission 02</span>
      </header>
      <div className={styles.workspace}>
        <aside className={styles.brief}>
          <p className={styles.briefLabel}>Current task</p>
          <h2>{task.title}</h2>
          <p>{task.instructions}</p>
          <div className={styles.rubric}><span>Required</span><strong>Heading 1 + bulleted list</strong><small>Target: “{task.targetText}”</small></div>
          <button className={styles.checkButton} onClick={evaluate}>Check document</button>
          {result && <div className={result.passed ? styles.success : styles.feedback}>{result.passed ? 'Task complete. Your formatting matches the rubric.' : result.missingChecks.join(' ')}</div>}
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
            {(['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'] as const).map((command) => <button key={command} className={styles.toolButton} onMouseDown={(event) => event.preventDefault()} onClick={() => apply(command)} aria-label={command}>{command === 'justifyLeft' ? '≡' : command === 'justifyCenter' ? '☷' : command === 'justifyRight' ? '≣' : '▤'}</button>)}
          </div>
          <div className={styles.paper} ref={editorRef} contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{ __html: initialDocument }} role="textbox" aria-label="Editable document" />
        </section>
      </div>
    </main>
  );
}
