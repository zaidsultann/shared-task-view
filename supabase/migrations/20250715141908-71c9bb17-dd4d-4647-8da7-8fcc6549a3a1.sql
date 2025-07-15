-- Check if storage policies exist and create permissive ones for taskboard-uploads bucket
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Allow public uploads to taskboard-uploads" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public access to taskboard-uploads" ON storage.objects;
  
  -- Create permissive storage policies
  CREATE POLICY "Allow public uploads to taskboard-uploads" 
  ON storage.objects 
  FOR INSERT 
  WITH CHECK (bucket_id = 'taskboard-uploads');
  
  CREATE POLICY "Allow public access to taskboard-uploads" 
  ON storage.objects 
  FOR SELECT 
  USING (bucket_id = 'taskboard-uploads');
  
  CREATE POLICY "Allow public updates to taskboard-uploads" 
  ON storage.objects 
  FOR UPDATE 
  USING (bucket_id = 'taskboard-uploads');
  
  CREATE POLICY "Allow public deletes from taskboard-uploads" 
  ON storage.objects 
  FOR DELETE 
  USING (bucket_id = 'taskboard-uploads');
END $$;