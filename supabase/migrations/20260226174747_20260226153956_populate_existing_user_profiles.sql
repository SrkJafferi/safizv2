/*
  # Populate Profiles for Existing Users

  Creates profile entries for users that don't have profiles yet
*/

DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id, email, raw_user_meta_data 
    FROM auth.users 
    WHERE id NOT IN (SELECT id FROM public.profiles)
  LOOP
    INSERT INTO public.profiles (id, role, full_name)
    VALUES (
      user_record.id,
      COALESCE(user_record.raw_user_meta_data->>'role', 'printer_operator')::user_role,
      COALESCE(user_record.raw_user_meta_data->>'full_name', user_record.email)
    );
  END LOOP;
END $$;
