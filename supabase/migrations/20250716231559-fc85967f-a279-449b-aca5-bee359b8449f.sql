-- Drop the existing restrictive delete policy
DROP POLICY IF EXISTS "Users can delete tasks" ON public.tasks;

-- Create a new policy that allows anyone to delete any task
CREATE POLICY "Anyone can delete tasks" 
ON public.tasks 
FOR DELETE 
TO authenticated
USING (true);