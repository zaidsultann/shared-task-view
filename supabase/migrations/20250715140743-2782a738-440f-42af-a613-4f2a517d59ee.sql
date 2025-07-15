-- Update the tasks insert policy to allow mock users
DROP POLICY IF EXISTS "Authenticated users can create tasks" ON public.tasks;

CREATE POLICY "Users can create tasks" 
ON public.tasks 
FOR INSERT 
WITH CHECK (
  -- Allow authenticated users to create tasks with their own ID
  (auth.uid() = created_by) OR
  -- Allow mock test users (ZS, AS, TS, MW)
  (created_by IN (
    '44444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111', 
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333'
  ))
);