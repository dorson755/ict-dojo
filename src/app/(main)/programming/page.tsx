import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/aws/auth-utils';
import ProgrammingClient from './ProgrammingClient';
import { UserRepository } from '@/lib/aws/repositories/user.repository';

export default async function ProgrammingPage() {
  const user = await getUserSession();
  if (!user) redirect('/login');
  if (user.role !== 'student') redirect(user.role === 'teacher' ? '/teacher' : '/parent');
  const profile = await UserRepository.getProfile(user.id);
  if ((profile?.platform_level ?? 1) < 5) redirect('/dashboard');
  return (
    <main className="container-narrow page stack gap-6">
      <div>
        <h1>Programming dojo</h1>
        <p className="text-muted mt-2">Python path for Grades 9–12: variables, data types, conditions, loops, and functions.</p>
      </div>
      <ProgrammingClient />
    </main>
  );
}
