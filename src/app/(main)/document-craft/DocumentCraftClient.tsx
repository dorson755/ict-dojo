'use client';

import { useRef, useState } from 'react';
import { evaluateDocument } from '@/domains/document-craft/evaluator';
import type { DocumentMark, DocumentTask } from '@/domains/document-craft/types';
import styles from './document-craft.module.css';

const task: DocumentTask = {
  id: 'format-dojo-name',
  title: 'Give the dojo name emphasis',
  instructions: 'Select “ICT Dojo” in the paragraph, then apply both bold and underline.',
  targetText: 'ICT Dojo',
  requiredMarks: ['bold', 'underline'],
};

const initialDocument = '<h1>A day at the dojo</h1><p>ICT Dojo turns everyday computer skills into deliberate practice.</p><p>Small improvements compound when the work is focused.</p>';

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
        <span className={styles.level}>Mission 01</span>
      </header>
      <div className={styles.workspace}>
        <aside className={styles.brief}>
          <p className={styles.briefLabel}>Current task</p>
          <h2>{task.title}</h2>
          <p>{task.instructions}</p>
          <div className={styles.rubric}><span>Required</span><strong>Bold + underline</strong><small>Target: “{task.targetText}”</small></div>
          <button className={styles.checkButton} onClick={evaluate}>Check document</button>
          {result && <div className={result.passed ? styles.success : styles.feedback}>{result.passed ? 'Task complete. Your formatting matches the rubric.' : result.missingChecks.join(' ')}</div>}
        </aside>
        <section className={styles.editorShell} aria-label="Document editor">
          <div className={styles.toolbar} role="toolbar" aria-label="Formatting toolbar">
            {buttons.map((button) => <button key={button.command} className={`${styles.toolButton} ${button.mark === 'bold' ? styles.bold : ''}`} onMouseDown={(event) => event.preventDefault()} onClick={() => apply(button.command)} aria-label={button.command}>{button.label}</button>)}
            <span className={styles.divider} />
            {(['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'] as const).map((command) => <button key={command} className={styles.toolButton} onMouseDown={(event) => event.preventDefault()} onClick={() => apply(command)} aria-label={command}>{command === 'justifyLeft' ? '≡' : command === 'justifyCenter' ? '☷' : command === 'justifyRight' ? '≣' : '▤'}</button>)}
          </div>
          <div className={styles.paper} ref={editorRef} contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{ __html: initialDocument }} role="textbox" aria-label="Editable document" />
        </section>
      </div>
    </main>
  );
}
