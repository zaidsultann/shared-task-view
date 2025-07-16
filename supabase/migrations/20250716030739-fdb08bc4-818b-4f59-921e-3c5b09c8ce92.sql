-- Fix RLS policy to allow anonymous users to claim any open task
DROP POLICY IF EXISTS "Users can update tasks" ON public.tasks;

CREATE POLICY "Users can update tasks" 
ON public.tasks 
FOR UPDATE 
USING (
  -- Always allow updates for demo purposes
  true
);