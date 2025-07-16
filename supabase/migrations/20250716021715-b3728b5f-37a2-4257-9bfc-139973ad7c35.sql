-- Step 1: Drop the existing UPDATE policy that references taken_by
DROP POLICY "Users can update tasks" ON public.tasks;