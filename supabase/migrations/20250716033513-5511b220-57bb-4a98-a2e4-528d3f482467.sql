-- Update the tasks status check constraint to include all valid statuses
ALTER TABLE public.tasks DROP CONSTRAINT tasks_status_check;

-- Add the updated constraint with all valid status values
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check 
CHECK (status = ANY (ARRAY[
  'open'::text, 
  'in_progress'::text, 
  'in_progress_no_file'::text, 
  'in_progress_with_file'::text, 
  'feedback_needed'::text, 
  'completed'::text, 
  'awaiting_approval'::text
]));