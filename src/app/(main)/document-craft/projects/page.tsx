import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/aws/auth-utils';
import { DOCUMENT_PROJECTS } from '@/domains/document-craft/projects';
import type { DocumentTask } from '@/domains/document-craft/types';
import styles from './projects.module.css';

function getProjectChecks(task: DocumentTask): string[] {
  const checks: string[] = [];
  if (task.requiredBlock) checks.push(`Format the title as ${task.requiredBlock.toUpperCase()}`);
  if (task.requiredMarks?.length) checks.push(`Apply ${task.requiredMarks.join(', ')} formatting`);
  if (task.requiredAlignment) checks.push(`Set ${task.requiredAlignment} alignment`);
  if (task.requiredList) checks.push(`Create a ${task.requiredList} list`);
  if (task.requiredTable) checks.push('Insert a table');
  if (task.requiredPageBreak) checks.push('Add a page break');
  if (task.requiredFootnote) checks.push('Insert a footnote');
  if (task.requiredCitation) checks.push('Add a citation');
  if (task.requiredColumns) checks.push(`Apply a ${task.requiredColumns}-column layout`);
  if (task.requiredTrackedChange) checks.push('Record a tracked change');
  return checks;
}

export default async function DocumentProjectsPage() {
  const user = await getUserSession();
  if (!user) redirect('/login');
  if (user.role !== 'student') redirect(user.role === 'teacher' ? '/teacher' : '/parent');

  return (
    <main className={styles.page}>
      <Link href="/dashboard" className={styles.back}>← Back to dashboard</Link>
      <p className={styles.kicker}>Document craft / project studio</p>
      <h1 className={styles.title}>Make something real.</h1>
      <p className={styles.subtitle}>Choose a brief, build the document, and prove you can produce professional work.</p>

      <section className={styles.howItWorks} aria-label="How document projects work">
        <h2>How it works</h2>
        <ol className={styles.steps}>
          <li><strong>Pick a project</strong> below and read its brief.</li>
          <li><strong>Enter the editor</strong> with the starter text already loaded.</li>
          <li><strong>Follow the checklist</strong> in the sidebar to format the document.</li>
          <li><strong>Click Check document</strong> to see if you met every requirement.</li>
          <li><strong>Pass the project</strong> to save it to your portfolio.</li>
        </ol>
      </section>

      <div className={styles.grid}>
        {DOCUMENT_PROJECTS.map((project, index) => {
          const checks = getProjectChecks(project.task);
          return (
            <article className={styles.card} key={project.id}>
              <span className={styles.index}>0{index + 1}</span>
              <h2>{project.title}</h2>
              <p>{project.description}</p>
              <div className={styles.tags}>
                {checks.slice(0, 3).map((check) => <span key={check} className={styles.tag}>{check}</span>)}
                {checks.length > 3 && <span className={styles.tag}>+{checks.length - 3} more</span>}
              </div>
              <details className={styles.checklist}>
                <summary>Full checklist ({checks.length})</summary>
                <ul>
                  {checks.map((check) => <li key={check}>{check}</li>)}
                </ul>
              </details>
              <Link className="btn btn-primary" href={`/document-craft?project=${project.id}`}>Start project</Link>
            </article>
          );
        })}
      </div>
    </main>
  );
}
