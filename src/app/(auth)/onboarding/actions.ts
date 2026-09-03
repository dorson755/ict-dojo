'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function completeOnboarding(formData: FormData) {
  const gradeLevelStr = formData.get('gradeLevel') as string;
  const gradeLevel = parseInt(gradeLevelStr, 10);

  if (isNaN(gradeLevel) || gradeLevel < 1 || gradeLevel > 12) {
    return { error: 'Invalid grade level selected.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated.' };
  }

  // Update the student_profiles table (cast any to avoid TS never errors with hand-rolled DB types)
  const { error } = await (supabase.from('student_profiles') as any)
    .update({ grade_level: gradeLevel })
    .eq('id', user.id);

  if (error) {
    return { error: 'Failed to save profile information. Please try again.' };
  }

  // Also initialize their domain progression for Typing
  const { data: typingDomain } = await (supabase.from('learning_domains') as any)
    .select('*')
    .eq('slug', 'typing')
    .single();

  if (typingDomain) {
    await (supabase.from('domain_progression') as any).upsert({
      student_id: user.id,
      domain_id: typingDomain.id,
      status: 'active',
    }, { onConflict: 'student_id, domain_id' });
  }

  revalidatePath('/', 'layout');
  redirect('/diagnostic');
}
