-- Create sample tasks for testing the TaskBoard
INSERT INTO public.tasks (business_name, brief, created_by, status)
VALUES 
  ('Tech Startup Inc.', 'Build a modern landing page with React and TypeScript', '11111111-1111-1111-1111-111111111111', 'open'),
  ('Local Restaurant', 'Design a food delivery mobile app with user authentication', '22222222-2222-2222-2222-222222222222', 'open'),
  ('E-commerce Store', 'Develop a product catalog with search and filtering features', '33333333-3333-3333-3333-333333333333', 'in_progress'),
  ('Healthcare Clinic', 'Create a patient appointment booking system', '44444444-4444-4444-4444-444444444444', 'completed'),
  ('Digital Agency', 'Build a portfolio website with CMS integration', '11111111-1111-1111-1111-111111111111', 'open');