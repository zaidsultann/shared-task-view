-- Enable replica identity for tasks table to capture full row data for realtime
ALTER TABLE public.tasks REPLICA IDENTITY FULL;