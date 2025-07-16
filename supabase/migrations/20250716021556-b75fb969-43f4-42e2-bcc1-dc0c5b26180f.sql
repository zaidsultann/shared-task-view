-- Add claimed_at column to tasks table
ALTER TABLE public.tasks ADD COLUMN claimed_at TIMESTAMP WITH TIME ZONE;

-- Change taken_by from UUID to TEXT to store usernames
ALTER TABLE public.tasks ALTER COLUMN taken_by TYPE TEXT;