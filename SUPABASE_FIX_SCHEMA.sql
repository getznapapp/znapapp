-- Fix schema type mismatch for foreign key constraint
-- Run this script in your Supabase SQL editor

-- First, drop the existing foreign key constraint if it exists
ALTER TABLE photos DROP CONSTRAINT IF EXISTS fk_photos_camera;

-- Drop existing tables to recreate with correct types
DROP TABLE IF EXISTS photos;
DROP TABLE IF EXISTS cameras;

-- Create cameras table with UUID primary key
CREATE TABLE cameras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Create photos table with UUID foreign key reference
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cameraId UUID NOT NULL,
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cameras_created_at ON cameras(createdAt);
CREATE INDEX IF NOT EXISTS idx_cameras_created_by ON cameras(createdBy);
CREATE INDEX IF NOT EXISTS idx_cameras_end_date ON cameras(endDate);

CREATE INDEX IF NOT EXISTS idx_photos_camera_id ON photos(cameraId);
CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(userId);
CREATE INDEX IF NOT EXISTS idx_photos_uploaded_at ON photos(uploadedAt);
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at);

-- Enable Row Level Security (RLS) on both tables
ALTER TABLE cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for cameras table
CREATE POLICY "Allow camera creation" ON cameras
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow camera viewing" ON cameras
  FOR SELECT USING (true);

CREATE POLICY "Allow camera updates by owner" ON cameras
  FOR UPDATE USING (createdBy = auth.uid()::text OR createdBy IS NULL);

CREATE POLICY "Allow camera deletion by owner" ON cameras
  FOR DELETE USING (createdBy = auth.uid()::text OR createdBy IS NULL);

-- Create RLS policies for photos table
CREATE POLICY "Allow photo uploads" ON photos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow photo viewing" ON photos
  FOR SELECT USING (true);

CREATE POLICY "Allow photo updates by owner" ON photos
  FOR UPDATE USING (userId = auth.uid()::text OR userId = 'anonymous');

CREATE POLICY "Allow photo deletion by owner" ON photos
  FOR DELETE USING (userId = auth.uid()::text OR userId = 'anonymous');

-- Grant necessary permissions
GRANT ALL ON cameras TO authenticated;
GRANT ALL ON cameras TO anon;
GRANT ALL ON photos TO authenticated;
GRANT ALL ON photos TO anon;

-- Create function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
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

-- Verify setup
SELECT 'Setup completed successfully' as status;