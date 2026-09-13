import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/aws/auth-utils';
import { DocumentRepository } from '@/lib/aws/repositories/document.repository';
import { DOCUMENT_PROJECTS } from '@/domains/document-craft/projects';
import styles from './portfolio.module.css';

export default async function DocumentPortfolioPage() {
  const user = await getUserSession();
  if (!user) redirect('/login');
  if (user.role !== 'student') redirect(user.role === 'teacher' ? '/teacher' : '/parent');
  const attempts = await DocumentRepository.getAttempts(user.id);
  return <main className={styles.page}><Link href="/document-craft/projects" className={styles.back}>← Project studio</Link><h1 className={styles.title}>Your document portfolio</h1><p className={styles.subtitle}>Completed project attempts and the skills you have demonstrated.</p>{attempts.length ? <div className={styles.list}>{attempts.map((attempt) => <article className={styles.card} key={attempt.created_at}><div><h2>{DOCUMENT_PROJECTS.find((project) => project.id === attempt.project_id)?.title || attempt.project_id}</h2><p>{new Date(attempt.created_at).toLocaleDateString()} · {attempt.completed_checks.length} checks completed</p></div><span className={styles.badge}>{attempt.passed ? 'Passed' : 'In progress'}</span></article>)}</div> : <section className={styles.empty}><h2>Your portfolio is empty</h2><p>Complete a project to save it here.</p><Link href="/document-craft/projects" className="btn btn-primary">Choose a project</Link></section>}</main>;
}
