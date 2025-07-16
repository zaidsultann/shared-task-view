-- Add upload_url column for storing uploaded file URLs
ALTER TABLE public.tasks ADD COLUMN upload_url TEXT;

-- Update the status values to match the new flow
-- Note: We'll keep the existing statuses and add the new ones as needed