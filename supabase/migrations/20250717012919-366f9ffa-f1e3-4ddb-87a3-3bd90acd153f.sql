-- Enable replication for all relevant tables to support real-time updates

-- Enable replica identity for profiles table (for user status updates)
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- Ensure tasks table is added to realtime publication (if not already)
-- Note: tasks table already has REPLICA IDENTITY FULL from previous migration