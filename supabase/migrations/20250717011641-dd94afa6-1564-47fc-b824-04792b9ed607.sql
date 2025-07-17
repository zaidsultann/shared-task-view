-- Enable replica identity for tasks table to capture full row data for realtime
ALTER TABLE public.tasks REPLICA IDENTITY FULL;

-- Add tasks table to the realtime publication to enable real-time functionality
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;