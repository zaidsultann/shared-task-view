-- Create demo users with specific usernames and password
-- Note: In production, users would sign up normally through Supabase Auth

-- Demo user 1: AS
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'AS@demo.com',
  crypt('dz4132', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"username": "AS"}',
  false,
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Demo user 2: TS
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000000',
  'TS@demo.com',
  crypt('dz4132', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"username": "TS"}',
  false,
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Demo user 3: MW
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '00000000-0000-0000-0000-000000000000',
  'MW@demo.com',
  crypt('dz4132', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"username": "MW"}',
  false,
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Demo user 4: ZS
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  '00000000-0000-0000-0000-000000000000',
  'ZS@demo.com',
  crypt('dz4132', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"username": "ZS"}',
  false,
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Create corresponding profiles for the demo users
INSERT INTO public.profiles (user_id, username)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'AS'),
  ('22222222-2222-2222-2222-222222222222', 'TS'),
  ('33333333-3333-3333-3333-333333333333', 'MW'),
  ('44444444-4444-4444-4444-444444444444', 'ZS')
ON CONFLICT (user_id) DO NOTHING;