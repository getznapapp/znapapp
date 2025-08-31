-- Drop existing photos table if it exists (to recreate with proper schema)
DROP TABLE IF EXISTS photos CASCADE;

-- Create photos table for storing photo metadata
CREATE TABLE photos (
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

-- Create indexes for faster queries
CREATE INDEX idx_photos_camera_id ON photos(cameraId);
CREATE INDEX idx_photos_user_id ON photos(userId);
CREATE INDEX idx_photos_uploaded_at ON photos(uploadedAt);
CREATE INDEX idx_photos_created_at ON photos(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow photo uploads" ON photos;
DROP POLICY IF EXISTS "Allow photo viewing" ON photos;
DROP POLICY IF EXISTS "Allow photo updates by owner" ON photos;
DROP POLICY IF EXISTS "Allow photo deletion by owner" ON photos;

-- Create policy to allow anyone to insert photos (for anonymous users)
CREATE POLICY "Allow photo uploads" ON photos
  FOR INSERT WITH CHECK (true);

-- Create policy to allow anyone to read photos (for viewing galleries)
CREATE POLICY "Allow photo viewing" ON photos
  FOR SELECT USING (true);

-- Create policy to allow users to update their own photos
CREATE POLICY "Allow photo updates by owner" ON photos
  FOR UPDATE USING (userId = auth.uid()::text OR userId = 'anonymous');

-- Create policy to allow users to delete their own photos
CREATE POLICY "Allow photo deletion by owner" ON photos
  FOR DELETE USING (userId = auth.uid()::text OR userId = 'anonymous');

-- Grant necessary permissions
GRANT ALL ON photos TO authenticated;
GRANT ALL ON photos TO anon;

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_photos_updated_at ON photos;
CREATE TRIGGER update_photos_updated_at
    BEFORE UPDATE ON photos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verify table creation
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'photos' 
ORDER BY ordinal_position;