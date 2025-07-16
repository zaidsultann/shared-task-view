-- Update RLS policy to allow mock users to claim any open task
DROP POLICY IF EXISTS "Users can update tasks" ON public.tasks;

CREATE POLICY "Users can update tasks" 
ON public.tasks 
FOR UPDATE 
USING (
  -- Allow if user created the task
  (auth.uid() = created_by) 
  OR 
  -- Allow if created by demo users (mock auth)
  (created_by = ANY (ARRAY[
    '44444444-4444-4444-4444-444444444444'::uuid, 
    '11111111-1111-1111-1111-111111111111'::uuid, 
    '22222222-2222-2222-2222-222222222222'::uuid, 
    '33333333-3333-3333-3333-333333333333'::uuid
  ])) 
  OR 
  -- Allow any authenticated user to claim open tasks
  (auth.role() = 'authenticated'::text)
  OR
  -- Allow anonymous users for demo purposes (when using mock auth)
  (auth.role() = 'anon'::text AND status = 'open')
);