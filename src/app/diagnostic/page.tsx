import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DiagnosticClient from './DiagnosticClient';

export default async function DiagnosticPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Ensure they don't already have DNA established
  const { data: dna } = await (supabase.from('typing_dna') as any)
    .select('id')
    .eq('student_id', user.id)
    .single();

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
