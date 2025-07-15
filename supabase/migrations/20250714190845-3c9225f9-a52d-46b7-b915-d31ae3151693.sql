-- Create profiles for the demo users
-- These will be linked when users sign up through Supabase Auth
INSERT INTO public.profiles (user_id, username)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'AS'),
  ('22222222-2222-2222-2222-222222222222', 'TS'),
  ('33333333-3333-3333-3333-333333333333', 'MW'),
  ('44444444-4444-4444-4444-444444444444', 'ZS')
ON CONFLICT (user_id) DO NOTHING;

-- Create sample tasks using the profile user_ids
INSERT INTO public.tasks (business_name, brief, created_by, status)
VALUES 
  ('Tech Startup Inc.', 'Build a modern landing page with React and TypeScript', '11111111-1111-1111-1111-111111111111', 'open'),
  ('Local Restaurant', 'Design a food delivery mobile app with user authentication', '22222222-2222-2222-2222-222222222222', 'open'),
  ('E-commerce Store', 'Develop a product catalog with search and filtering features', '33333333-3333-3333-3333-333333333333', 'in_progress'),
  ('Healthcare Clinic', 'Create a patient appointment booking system', '44444444-4444-4444-4444-444444444444', 'completed'),
  ('Digital Agency', 'Build a portfolio website with CMS integration', '11111111-1111-1111-1111-111111111111', 'open');