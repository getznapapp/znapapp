-- Create photos table for storing photo metadata
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_photos_camera_id ON photos(cameraId);
CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(userId);
CREATE INDEX IF NOT EXISTS idx_photos_uploaded_at ON photos(uploadedAt);

-- Enable Row Level Security (RLS)
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

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