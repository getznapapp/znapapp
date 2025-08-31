# Supabase Setup Instructions

## Quick Setup

1. **Go to your Supabase Dashboard**
2. **Navigate to SQL Editor**
3. **Run these SQL commands in order:**

### Step 1: Create Cameras Table

```sql
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
```

### Step 2: Create Photos Table

```sql
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
```

### Step 3: Create Storage Bucket

1. Go to **Storage** in your Supabase Dashboard
2. Click **New bucket**
3. Name it `camera-photos`
4. Make it **Public**
5. Click **Create bucket**

### Step 4: Test the Setup

After running the SQL commands and creating the storage bucket, use the app's "Setup Supabase" screen to test the connection.

## Troubleshooting

If you get errors:

1. **"relation does not exist"** - The tables haven't been created yet. Run the SQL commands above.
2. **"permission denied"** - Check that RLS policies are set up correctly.
3. **"storage bucket not found"** - Create the `camera-photos` bucket in Storage.

## What This Sets Up

- **cameras table**: Stores camera event metadata (name, end date, settings)
- **photos table**: Stores photo metadata (file paths, user info, timestamps)
- **camera-photos bucket**: Stores the actual image files
- **RLS policies**: Allows anonymous users to create cameras and upload photos