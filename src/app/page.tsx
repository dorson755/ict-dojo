import { redirect } from 'next/navigation';

export default function Home() {
  // Always redirect to dashboard, which will handle auth checks
  redirect('/dashboard');
}
