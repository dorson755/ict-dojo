import { redirect } from 'next/navigation';
import DiagnosticClient from './DiagnosticClient';
import { getUserSession } from '@/lib/firebase/auth-utils';
import { UserRepository } from '@/lib/firebase/repositories/user.repository';
import styles from '../practice/practice.module.css';

export default async function DiagnosticPage() {
  const user = await getUserSession();

  if (!user) {
    redirect('/login');
  }

  const dna = await UserRepository.getTypingDNA(user.id);

  if (dna) {
    redirect('/dashboard');
  }

  return (
    <div className={styles.page}>
      <div className={styles.diagHeader}>
        <h1 className={styles.diagTitle}>Initial assessment</h1>
        <p className={styles.diagDesc}>
          Before we begin your training, we need to understand your current skill level.
          Complete these short typing stages so we can build your personalized learning path.
        </p>
      </div>

      <DiagnosticClient studentId={user.id} />
    </div>
  );
}
