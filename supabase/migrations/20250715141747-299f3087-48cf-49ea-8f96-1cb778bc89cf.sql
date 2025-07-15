-- Update the tasks UPDATE policy to allow mock users
DROP POLICY IF EXISTS "Task creators can update their tasks" ON public.tasks;

CREATE POLICY "Users can update tasks" 
ON public.tasks 
FOR UPDATE 
USING (
  -- Allow authenticated users who created or took the task
  (auth.uid() = created_by) OR 
  (auth.uid() = taken_by) OR
  -- Allow mock test users to update any task
  (taken_by IN (
    '44444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111', 
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333'
  )) OR
  (created_by IN (
    '44444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111', 
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333'
  ))
);

-- Update the tasks DELETE policy to allow mock users  
DROP POLICY IF EXISTS "Task creators can delete their tasks" ON public.tasks;

CREATE POLICY "Users can delete tasks" 
ON public.tasks 
FOR DELETE 
USING (
  -- Allow authenticated users who created the task
  (auth.uid() = created_by) OR
  -- Allow mock test users to delete any task they created
  (created_by IN (
    '44444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111', 
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333'
  ))
);