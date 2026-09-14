'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Editor as TinyMCEEditor } from 'tinymce';
import { evaluateDocument } from '@/domains/document-craft/evaluator';
import type { DocumentTask } from '@/domains/document-craft/types';
import Link from 'next/link';
import { DOCUMENT_PROJECTS } from '@/domains/document-craft/projects';
import styles from './document-craft.module.css';
import { saveDocumentProject } from './actions';

const TinyMceEditor = dynamic(() => import('./TinyMceEditor'), { ssr: false });

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
  const editorRef = useRef<TinyMCEEditor | null>(null);
  const [result, setResult] = useState<{ passed: boolean; missingChecks: string[]; saved?: boolean } | null>(null);

  function evaluate() {
    const html = editorRef.current?.getContent() ?? '';
    const evaluation = evaluateDocument(html, task);
    setResult(evaluation);
    if (evaluation.passed) {
      void saveDocumentProject(project?.id ?? task.id, html, true, evaluation.completedChecks).then(() =>
        setResult({ ...evaluation, saved: true }),
      );
    }
  }

  function downloadDocument() {
    const html = editorRef.current?.getContent() ?? '';
    const blob = new Blob([`<!doctype html><html><body>${html}</body></html>`], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${project?.id ?? 'document-craft'}.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Document craft / fundamentals</p>
          <h1 className={styles.title}>Format with intention.</h1>
          <p className={styles.subtitle}>Practice the document skills that make your work clear, polished, and professional.</p>
        </div>
        <Link className={styles.level} href="/document-craft/projects">
          Projects
        </Link>
      </header>
      <div className={styles.workspace}>
        <aside className={styles.brief}>
          <p className={styles.briefLabel}>Current task</p>
          <h2>{task.title}</h2>
          <p>{task.instructions}</p>
          <div className={styles.rubric}>
            <span>Required</span>
            <strong>Footnote + citation + columns + tracked change</strong>
            <small>Practice advanced document-production controls.</small>
          </div>
          <button className={styles.checkButton} onClick={evaluate}>
            Check document
          </button>
          {result && (
            <div className={result.passed ? styles.success : styles.feedback}>
              {result.passed
                ? `Task complete. Your formatting matches the rubric.${result.saved ? ' Saved to your portfolio.' : ''}`
                : result.missingChecks.join(' ')}
            </div>
          )}
          <button className={styles.downloadButton} onClick={downloadDocument}>
            Download document
          </button>
          <Link className={styles.portfolioLink} href="/document-craft/portfolio">
            View portfolio
          </Link>
        </aside>
        <section className={styles.editorShell} aria-label="Document editor">
          <TinyMceEditor initialValue={initialDocument} onInit={(editor) => { editorRef.current = editor; }} />
        </section>
      </div>
    </main>
  );
}
