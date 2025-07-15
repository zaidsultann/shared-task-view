-- First, let's check if the trigger exists and create it if needed
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  RETURN new;
END;
$$;

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert some test users directly into profiles for immediate testing
-- (These will have user_ids that don't exist in auth.users, but that's ok for testing)
INSERT INTO public.profiles (user_id, username) 
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'AS'),
  ('22222222-2222-2222-2222-222222222222', 'TS'),
  ('33333333-3333-3333-3333-333333333333', 'MW'),
  ('44444444-4444-4444-4444-444444444444', 'ZS')
ON CONFLICT (user_id) DO NOTHING;

-- Insert some sample tasks
INSERT INTO public.tasks (business_name, brief, created_by, status) 
VALUES 
  ('TechCorp', 'Create a modern website with React', '44444444-4444-4444-4444-444444444444', 'open'),
  ('StartupXYZ', 'Build a mobile app prototype', '44444444-4444-4444-4444-444444444444', 'open'),
  ('LocalBiz', 'E-commerce platform development', '44444444-4444-4444-4444-444444444444', 'in_progress')
ON CONFLICT DO NOTHING;