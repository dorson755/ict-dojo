import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/aws/auth-utils';
import { DOCUMENT_PROJECTS } from '@/domains/document-craft/projects';
import styles from './projects.module.css';

export default async function DocumentProjectsPage() {
  const user = await getUserSession();
  if (!user) redirect('/login');
  if (user.role !== 'student') redirect(user.role === 'teacher' ? '/teacher' : '/parent');

  return <main className={styles.page}><Link href="/document-craft" className={styles.back}>← Back to practice</Link><p className={styles.kicker}>Document craft / project studio</p><h1 className={styles.title}>Make something real.</h1><p className={styles.subtitle}>Choose a brief, build the document, and prove you can produce professional work.</p><div className={styles.grid}>{DOCUMENT_PROJECTS.map((project, index) => <article className={styles.card} key={project.id}><span className={styles.index}>0{index + 1}</span><h2>{project.title}</h2><p>{project.description}</p><Link className="btn btn-primary" href={`/document-craft?project=${project.id}`}>Start project</Link></article>)}</div></main>;
}
