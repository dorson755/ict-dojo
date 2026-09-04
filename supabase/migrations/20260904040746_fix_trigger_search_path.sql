-- Supabase trigger functions running as SECURITY DEFINER execute with the privileges of the creator.
-- However, by default, the search_path is very restrictive in Supabase for security reasons.
-- If the search_path does not include `public`, casting to a custom type like `user_role` will fail,
-- causing the `auth.users` insert to abort and return "Database error saving new user".

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, display_name)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'student'::public.user_role),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );

  -- Create role-specific profile row automatically for students
  IF COALESCE((NEW.raw_user_meta_data->>'role'), 'student') = 'student' THEN
    INSERT INTO public.student_profiles (id) VALUES (NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
