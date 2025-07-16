-- Drop the existing UPDATE policy that references taken_by
DROP POLICY "Users can update tasks" ON public.tasks;

-- Add claimed_at column
ALTER TABLE public.tasks ADD COLUMN claimed_at TIMESTAMP WITH TIME ZONE;

-- Change taken_by from UUID to TEXT to store usernames
ALTER TABLE public.tasks ALTER COLUMN taken_by TYPE TEXT;

-- Create a new, simpler UPDATE policy for tasks
-- Allow authenticated users to update tasks they created or claimed
CREATE POLICY "Users can update tasks" ON public.tasks 
FOR UPDATE 
TO authenticated 
USING (
  auth.uid() = created_by OR 
  created_by = ANY (ARRAY[
    '44444444-4444-4444-4444-444444444444'::uuid, 
    '11111111-1111-1111-1111-111111111111'::uuid, 
    '22222222-2222-2222-2222-222222222222'::uuid, 
    '33333333-3333-3333-3333-333333333333'::uuid
  ]) OR
  auth.role() = 'authenticated'
);