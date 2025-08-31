-- Create cameras table for storing camera metadata
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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_cameras_created_at ON cameras(createdAt);
CREATE INDEX IF NOT EXISTS idx_cameras_created_by ON cameras(createdBy);
CREATE INDEX IF NOT EXISTS idx_cameras_end_date ON cameras(endDate);

-- Enable Row Level Security (RLS)
ALTER TABLE cameras ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to create cameras (for anonymous users)
CREATE POLICY "Allow camera creation" ON cameras
  FOR INSERT WITH CHECK (true);

-- Create policy to allow anyone to read cameras (for joining cameras)
CREATE POLICY "Allow camera viewing" ON cameras
  FOR SELECT USING (true);

-- Create policy to allow users to update their own cameras
CREATE POLICY "Allow camera updates by owner" ON cameras
  FOR UPDATE USING (createdBy = auth.uid()::text OR createdBy IS NULL);

-- Create policy to allow users to delete their own cameras
CREATE POLICY "Allow camera deletion by owner" ON cameras
  FOR DELETE USING (createdBy = auth.uid()::text OR createdBy IS NULL);