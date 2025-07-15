-- Add new columns for enhanced task lifecycle
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open',
ADD COLUMN IF NOT EXISTS versions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS feedback JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS has_feedback BOOLEAN DEFAULT false;

-- Update existing tasks to have the new status if they don't already
UPDATE public.tasks 
SET status = 'open' 
WHERE status IS NULL OR status = '';

-- Create function to handle feedback updates
CREATE OR REPLACE FUNCTION public.add_task_feedback(
  task_id_param UUID,
  comment_param TEXT,
  user_param TEXT,
  version_param INTEGER DEFAULT 1
) 
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.tasks 
  SET 
    feedback = feedback || jsonb_build_object(
      'user', user_param,
      'comment', comment_param,
      'version', version_param,
      'created_at', EXTRACT(EPOCH FROM NOW())
    ),
    has_feedback = true,
    updated_at = NOW()
  WHERE id = task_id_param;
END;
$$;

-- Create function to handle version uploads
CREATE OR REPLACE FUNCTION public.upload_task_version(
  task_id_param UUID,
  file_url_param TEXT,
  uploaded_by_param TEXT
) 
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_version INTEGER;
BEGIN
  -- Get the next version number
  SELECT COALESCE(jsonb_array_length(versions), 0) + 1 
  INTO new_version
  FROM public.tasks 
  WHERE id = task_id_param;
  
  -- Update the task with new version and status
  UPDATE public.tasks 
  SET 
    versions = versions || jsonb_build_object(
      'url', file_url_param,
      'version', new_version,
      'uploaded_at', EXTRACT(EPOCH FROM NOW()),
      'uploaded_by', uploaded_by_param
    ),
    current_file_url = file_url_param,
    status = 'awaiting_approval',
    updated_at = NOW()
  WHERE id = task_id_param;
END;
$$;

-- Create function to approve tasks
CREATE OR REPLACE FUNCTION public.approve_task(
  task_id_param UUID,
  approved_by_param TEXT
) 
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.tasks 
  SET 
    status = 'completed',
    has_feedback = false,
    approved_by = approved_by_param,
    approved_at = NOW(),
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = task_id_param;
END;
$$;