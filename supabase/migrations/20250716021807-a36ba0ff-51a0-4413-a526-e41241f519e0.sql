-- Step 2: Drop foreign key constraint and modify columns
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_taken_by_fkey;

-- Add claimed_at column
ALTER TABLE public.tasks ADD COLUMN claimed_at TIMESTAMP WITH TIME ZONE;

-- Change taken_by from UUID to TEXT to store usernames
ALTER TABLE public.tasks ALTER COLUMN taken_by TYPE TEXT;