-- Add archive functionality to tasks table
ALTER TABLE public.tasks ADD COLUMN is_archived boolean NOT NULL DEFAULT false;

-- Create index for better performance when filtering archived tasks
CREATE INDEX idx_tasks_archived ON public.tasks(is_archived);

-- Create index for archive date filtering
CREATE INDEX idx_tasks_archived_completed ON public.tasks(is_archived, completed_at);

-- Create function to auto-archive old completed tasks (older than 30 days)
CREATE OR REPLACE FUNCTION public.auto_archive_old_tasks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.tasks 
  SET is_archived = true, updated_at = now()
  WHERE status = 'completed' 
    AND completed_at < (now() - INTERVAL '30 days')
    AND is_archived = false
    AND is_deleted = false;
END;
$$;