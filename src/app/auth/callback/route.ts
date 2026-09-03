import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Check if they need onboarding
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await (supabase.from('student_profiles') as any)
          .select('*')
          .eq('id', user.id)
          .single();

        if (!profile?.grade_level) {
          return NextResponse.redirect(new URL('/onboarding', requestUrl.origin));
        }
      }
      return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL('/login?error=auth', requestUrl.origin));
}
