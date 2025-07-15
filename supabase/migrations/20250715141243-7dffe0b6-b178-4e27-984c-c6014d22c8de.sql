-- Temporarily drop the foreign key constraint on profiles table for testing
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- Add the missing mock user profiles without foreign key constraint
INSERT INTO public.profiles (user_id, username) VALUES
('11111111-1111-1111-1111-111111111111', 'AS'),
('22222222-2222-2222-2222-222222222222', 'TS'), 
('33333333-3333-3333-3333-333333333333', 'MW')
ON CONFLICT (user_id) DO NOTHING;