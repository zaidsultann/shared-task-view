-- Add new columns to tasks table for enhanced functionality
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS note TEXT,
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS versions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS feedback JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS has_feedback BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS current_file_url TEXT,
ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES public.profiles(user_id),
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(user_id),
ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS status_color TEXT DEFAULT 'red',
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Update status column to use the new enum-like values
-- Keep existing status values but add comment for clarity
COMMENT ON COLUMN public.tasks.status IS 'Status: open, in_progress, awaiting_approval, completed, not_interested, awaiting_payment, follow_up';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_status_location ON public.tasks(status, latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_has_feedback ON public.tasks(has_feedback) WHERE has_feedback = true;
CREATE INDEX IF NOT EXISTS idx_tasks_claimed_by ON public.tasks(claimed_by);
CREATE INDEX IF NOT EXISTS idx_tasks_approved_by ON public.tasks(approved_by);

-- Enable realtime for tasks table
ALTER TABLE public.tasks REPLICA IDENTITY FULL;

-- Add tasks to realtime publication if not already added
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'tasks'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
    END IF;
END $$;

-- Create function to update has_feedback when feedback is modified
CREATE OR REPLACE FUNCTION public.update_has_feedback()
RETURNS TRIGGER AS $$
BEGIN
    NEW.has_feedback = (jsonb_array_length(NEW.feedback) > 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic has_feedback updates
DROP TRIGGER IF EXISTS trigger_update_has_feedback ON public.tasks;
CREATE TRIGGER trigger_update_has_feedback
    BEFORE UPDATE OF feedback ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_has_feedback();

-- Create function to auto-increment version number on file uploads
CREATE OR REPLACE FUNCTION public.increment_version_on_file_upload()
RETURNS TRIGGER AS $$
BEGIN
    -- If current_file_url is being updated and is different from old value
    IF NEW.current_file_url IS NOT NULL AND 
       (OLD.current_file_url IS NULL OR NEW.current_file_url != OLD.current_file_url) THEN
        NEW.version_number = COALESCE(OLD.version_number, 0) + 1;
        
        -- Add to versions array
        NEW.versions = COALESCE(OLD.versions, '[]'::jsonb) || 
                      jsonb_build_object(
                        'url', NEW.current_file_url,
                        'version', NEW.version_number,
                        'uploaded_at', EXTRACT(EPOCH FROM NOW()),
                        'uploaded_by', NEW.taken_by
                      );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for version management
DROP TRIGGER IF EXISTS trigger_increment_version ON public.tasks;
CREATE TRIGGER trigger_increment_version
    BEFORE UPDATE OF current_file_url ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.increment_version_on_file_upload();