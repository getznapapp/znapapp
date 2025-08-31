-- Complete Supabase setup script for the disposable camera app
-- Run this script in your Supabase SQL editor

-- 1. Create cameras table first (since photos references it)
CREATE TABLE IF NOT EXISTS cameras (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  endDate TIMESTAMP WITH TIME ZONE NOT NULL,
  revealDelayType TEXT NOT NULL DEFAULT '24h',
  customRevealAt TIMESTAMP WITH TIME ZONE,
  createdAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  createdBy TEXT,
  maxPhotosPerPerson INTEGER DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create photos table with foreign key reference
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  cameraId TEXT NOT NULL,
  fileName TEXT NOT NULL,
  publicUrl TEXT NOT NULL,
  userId TEXT NOT NULL DEFAULT 'anonymous',
  userName TEXT NOT NULL DEFAULT 'Anonymous User',
  uploadedAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  mimeType TEXT NOT NULL DEFAULT 'image/jpeg',
  fileSize INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add foreign key constraint to cameras table
  CONSTRAINT fk_photos_camera FOREIGN KEY (cameraId) REFERENCES cameras(id) ON DELETE CASCADE
);

-- 3. Create indexes for better performance
-- Cameras table indexes
CREATE INDEX IF NOT EXISTS idx_cameras_created_at ON cameras(createdAt);
CREATE INDEX IF NOT EXISTS idx_cameras_created_by ON cameras(createdBy);
CREATE INDEX IF NOT EXISTS idx_cameras_end_date ON cameras(endDate);

-- Photos table indexes
CREATE INDEX IF NOT EXISTS idx_photos_camera_id ON photos(cameraId);
CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(userId);
CREATE INDEX IF NOT EXISTS idx_photos_uploaded_at ON photos(uploadedAt);
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at);

-- 4. Enable Row Level Security (RLS) on both tables
ALTER TABLE cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for cameras table
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow camera creation" ON cameras;
DROP POLICY IF EXISTS "Allow camera viewing" ON cameras;
DROP POLICY IF EXISTS "Allow camera updates by owner" ON cameras;
DROP POLICY IF EXISTS "Allow camera deletion by owner" ON cameras;

-- Create new policies for cameras
CREATE POLICY "Allow camera creation" ON cameras
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow camera viewing" ON cameras
  FOR SELECT USING (true);

CREATE POLICY "Allow camera updates by owner" ON cameras
  FOR UPDATE USING (createdBy = auth.uid()::text OR createdBy IS NULL);

CREATE POLICY "Allow camera deletion by owner" ON cameras
  FOR DELETE USING (createdBy = auth.uid()::text OR createdBy IS NULL);

-- 6. Create RLS policies for photos table
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow photo uploads" ON photos;
DROP POLICY IF EXISTS "Allow photo viewing" ON photos;
DROP POLICY IF EXISTS "Allow photo updates by owner" ON photos;
DROP POLICY IF EXISTS "Allow photo deletion by owner" ON photos;

-- Create new policies for photos - Allow all operations for both authenticated and anonymous users
CREATE POLICY "Allow photo uploads" ON photos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow photo viewing" ON photos
  FOR SELECT USING (true);

CREATE POLICY "Allow photo updates" ON photos
  FOR UPDATE USING (true);

CREATE POLICY "Allow photo deletion" ON photos
  FOR DELETE USING (true);

-- 7. Grant necessary permissions
GRANT ALL ON cameras TO authenticated;
GRANT ALL ON cameras TO anon;
GRANT ALL ON photos TO authenticated;
GRANT ALL ON photos TO anon;

-- 8. Create function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_cameras_updated_at ON cameras;
CREATE TRIGGER update_cameras_updated_at
    BEFORE UPDATE ON cameras
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_photos_updated_at ON photos;
CREATE TRIGGER update_photos_updated_at
    BEFORE UPDATE ON photos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 10. Create storage bucket for photos (if not exists)
-- Note: This needs to be done in the Supabase dashboard Storage section
-- Bucket name: camera-photos
-- Public: true
-- File size limit: 50MB
-- Allowed MIME types: image/*

-- 11. Verify setup
SELECT 'Cameras table' as table_name, count(*) as row_count FROM cameras
UNION ALL
SELECT 'Photos table' as table_name, count(*) as row_count FROM photos;

-- 12. Show table schemas for verification
SELECT 
  'cameras' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'cameras' 
ORDER BY ordinal_position;

-- Show photos table schema
SELECT 
  'photos' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'photos' 
ORDER BY ordinal_position;