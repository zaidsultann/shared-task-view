-- Create a function to clear deleted tasks using SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.clear_deleted_tasks()
RETURNS TABLE(deleted_task_id uuid, deleted_task_name text, deleted_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task_count integer;
BEGIN
  -- First get count of deleted tasks
  SELECT COUNT(*) INTO task_count FROM public.tasks WHERE is_deleted = true;
  
  -- Return deleted tasks info and delete them
  RETURN QUERY
  DELETE FROM public.tasks 
  WHERE is_deleted = true 
  RETURNING id as deleted_task_id, business_name as deleted_task_name, task_count as deleted_count;
END;
$$;