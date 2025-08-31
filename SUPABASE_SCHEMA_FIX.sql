-- SCHEMA FIX FOR PHOTOS TABLE COLUMN NAMING ISSUE
-- This script fixes the column naming issue where photos.cameraId does not exist
-- Copy and paste this ENTIRE script into Supabase SQL Editor and run it

-- 1. First, let's check the current schema of the photos table
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'photos' 
ORDER BY ordinal_position;

-- 2. Check if the photos table exists at all
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_name = 'photos'
) as photos_table_exists;

-- 3. If the table doesn't exist or has wrong schema, recreate it properly
-- First drop the table if it exists with wrong schema
DROP TABLE IF EXISTS photos CASCADE;

-- 4. Recreate the photos table with correct schema
CREATE TABLE photos (
  id TEXT PRIMARY KEY,
  cameraId TEXT NOT NULL,  -- This is the correct column name (camelCase)
  fileName TEXT NOT NULL,
  publicUrl TEXT NOT NULL,
  userId TEXT NOT NULL DEFAULT 'anonymous',
  userName TEXT NOT NULL DEFAULT 'Anonymous User',
  uploadedAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  mimeType TEXT NOT NULL DEFAULT 'image/jpeg',
  fileSize INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create indexes for better performance
CREATE INDEX idx_photos_camera_id ON photos(cameraId);
CREATE INDEX idx_photos_user_id ON photos(userId);
CREATE INDEX idx_photos_uploaded_at ON photos(uploadedAt);
CREATE INDEX idx_photos_created_at ON photos(created_at);

-- 6. Enable Row Level Security
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- 7. Create permissive RLS policies
CREATE POLICY "photos_allow_all" ON photos
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- 8. Grant permissions
GRANT ALL PRIVILEGES ON TABLE photos TO anon;
GRANT ALL PRIVILEGES ON TABLE photos TO authenticated;
GRANT ALL PRIVILEGES ON TABLE photos TO service_role;
GRANT ALL PRIVILEGES ON TABLE photos TO postgres;

-- 9. Create trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_photos_updated_at ON photos;
CREATE TRIGGER update_photos_updated_at
    BEFORE UPDATE ON photos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 10. Verify the new schema
SELECT 
  'photos' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'photos' 
ORDER BY ordinal_position;

-- 11. Test that we can query the table
SELECT 'SUCCESS: Photos table recreated with correct cameraId column!' as result;

-- 12. Show RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'photos'
ORDER BY policyname;