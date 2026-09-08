import { redirect } from 'next/navigation';
import DiagnosticClient from './DiagnosticClient';
import { getUserSession } from '@/lib/aws/auth-utils';
import { UserRepository } from '@/lib/aws/repositories/user.repository';

export default async function DiagnosticPage() {
  const user = await getUserSession();

  if (!user) {
    redirect('/login');
  }

  // Ensure they don't already have DNA established
  const dna = await UserRepository.getTypingDNA(user.id);

  if (dna) {
    // Already took the diagnostic or established a baseline
    redirect('/dashboard');
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', textAlign: 'center' }}>
        Initial Assessment
      </h1>
      <p style={{ color: '#64748b', marginBottom: '3rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto 3rem auto' }}>
        Before we begin your training in the Dojo, we need to understand your current skill level. 
        Complete these short typing stages so we can build your personalized learning path.
      </p>
      
      <DiagnosticClient studentId={user.id} />
    </div>
  );
}
