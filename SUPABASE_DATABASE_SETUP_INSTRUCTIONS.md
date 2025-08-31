# Supabase Database Setup Instructions

## Problem
The app is failing because the `photos` table doesn't exist in your Supabase database, causing errors like:
- "relation 'public.photos' does not exist"
- "Camera not found" errors
- Photo upload failures

## Solution

### Step 1: Run the Complete Setup Script

1. Open your Supabase dashboard
2. Go to the **SQL Editor** section
3. Create a new query
4. Copy and paste the entire contents of `SUPABASE_COMPLETE_SETUP.sql`
5. Click **Run** to execute the script

This will:
- Create the `cameras` table (if not exists)
- Create the `photos` table with proper foreign key relationships
- Set up all necessary indexes for performance
- Enable Row Level Security (RLS) with proper policies
- Create triggers for automatic timestamp updates
- Grant necessary permissions

### Step 2: Create Storage Bucket

1. In your Supabase dashboard, go to **Storage**
2. Click **Create Bucket**
3. Set the following:
   - **Name**: `camera-photos`
   - **Public**: ✅ Enabled
   - **File size limit**: 50MB
   - **Allowed MIME types**: `image/*`
4. Click **Create Bucket**

### Step 3: Set Storage Policies

1. In the Storage section, click on the `camera-photos` bucket
2. Go to **Policies** tab
3. Create the following policies:

**Policy 1: Allow uploads**
- Policy name: `Allow photo uploads`
- Allowed operation: `INSERT`
- Target roles: `authenticated`, `anon`
- USING expression: `true`
- WITH CHECK expression: `true`

**Policy 2: Allow downloads**
- Policy name: `Allow photo downloads`
- Allowed operation: `SELECT`
- Target roles: `authenticated`, `anon`
- USING expression: `true`

### Step 4: Verify Setup

Run this query in the SQL Editor to verify everything is set up correctly:

```sql
-- Check if tables exist and have data
SELECT 'cameras' as table_name, count(*) as row_count FROM cameras
UNION ALL
SELECT 'photos' as table_name, count(*) as row_count FROM photos;

-- Check table schemas
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('cameras', 'photos')
ORDER BY table_name, ordinal_position;
```

### Step 5: Test the Connection

After running the setup, test your app:

1. Try creating a new camera
2. Try taking a photo
3. Check if photos appear in the gallery

## Expected Schema

### Cameras Table
- `id` (TEXT, PRIMARY KEY)
- `name` (TEXT, NOT NULL)
- `endDate` (TIMESTAMP WITH TIME ZONE, NOT NULL)
- `revealDelayType` (TEXT, DEFAULT '24h')
- `customRevealAt` (TIMESTAMP WITH TIME ZONE)
- `createdAt` (TIMESTAMP WITH TIME ZONE, DEFAULT NOW())
- `createdBy` (TEXT)
- `maxPhotosPerPerson` (INTEGER, DEFAULT 20)

### Photos Table
- `id` (TEXT, PRIMARY KEY)
- `cameraId` (TEXT, NOT NULL, FOREIGN KEY → cameras.id)
- `fileName` (TEXT, NOT NULL)
- `publicUrl` (TEXT, NOT NULL)
- `userId` (TEXT, DEFAULT 'anonymous')
- `userName` (TEXT, DEFAULT 'Anonymous User')
- `uploadedAt` (TIMESTAMP WITH TIME ZONE, DEFAULT NOW())
- `mimeType` (TEXT, DEFAULT 'image/jpeg')
- `fileSize` (INTEGER, DEFAULT 0)

## Troubleshooting

### If you still get "relation does not exist" errors:
1. Make sure you ran the SQL script in the correct database
2. Check that your Supabase URL and API keys are correct in your app
3. Verify the tables exist by running: `SELECT * FROM information_schema.tables WHERE table_name IN ('cameras', 'photos');`

### If you get permission errors:
1. Make sure RLS policies are created correctly
2. Check that the `anon` role has the necessary permissions
3. Verify your Supabase API key has the right permissions

### If photo uploads fail:
1. Make sure the `camera-photos` storage bucket exists
2. Check that the bucket is public
3. Verify storage policies allow uploads and downloads

## Next Steps

After completing this setup:
1. Your app should be able to create cameras in Supabase
2. Photo uploads should work and store metadata in the `photos` table
3. Photo limits per user should work correctly
4. Gallery views should display photos from Supabase

The foreign key relationship ensures data integrity - photos can only be created for cameras that exist, and deleting a camera will automatically delete all its photos.