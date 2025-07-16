-- Step 3: Recreate the UPDATE policy with simplified permissions
CREATE POLICY "Users can update tasks" ON public.tasks 
FOR UPDATE 
TO authenticated 
USING (
  -- Allow task creators and demo users to update
  auth.uid() = created_by OR 
  created_by = ANY (ARRAY[
    '44444444-4444-4444-4444-444444444444'::uuid, 
    '11111111-1111-1111-1111-111111111111'::uuid, 
    '22222222-2222-2222-2222-222222222222'::uuid, 
    '33333333-3333-3333-3333-333333333333'::uuid
  ]) OR
  -- Allow all authenticated users to claim/update tasks
  auth.role() = 'authenticated'
);