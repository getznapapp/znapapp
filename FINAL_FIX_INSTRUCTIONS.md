# Final Fix Instructions for Photo Upload Issues

## The Problem
Your app is failing to upload photos because of restrictive Row Level Security (RLS) policies in both:
1. **Storage policies** - preventing file uploads to the camera-photos bucket
2. **Database policies** - preventing photo metadata from being saved to the photos table

## The Solution
Run the SQL script `COMPLETE_SUPABASE_FIX.sql` in your Supabase SQL editor.

## Steps:

1. **Go to your Supabase Dashboard**
2. **Navigate to SQL Editor**
3. **Copy and paste the contents of `COMPLETE_SUPABASE_FIX.sql`**
4. **Click "Run"**

## What this fixes:

### Storage Issues:
- Removes restrictive "own uploads only" policies
- Allows anyone to upload/view photos in the camera-photos bucket
- This is necessary for shared camera functionality

### Database Issues:
- Removes restrictive RLS policies on cameras and photos tables
- Allows all operations (INSERT, SELECT, UPDATE, DELETE) on both tables
- This allows photo metadata to be saved properly

## Alternative: Manual Fix via Supabase UI

If you prefer to use the UI:

### For Storage:
1. Go to **Storage > Policies**
2. **Delete** the existing restrictive policies for camera-photos
3. **Create new policy** with these settings:
   - Policy name: "Allow photo uploads"
   - Allowed operation: INSERT
   - Target roles: public
   - USING expression: `bucket_id = 'camera-photos'`
4. **Repeat for SELECT, UPDATE, DELETE operations**

### For Database:
1. Go to **Authentication > Policies**
2. Find the **cameras** and **photos** tables
3. **Delete** existing restrictive policies
4. **Create new policies** that allow all operations with `true` conditions

## Verification
After running the script, your photo uploads should work without the "row-level security policy" errors.

The script includes verification queries at the end to confirm the policies were created correctly.