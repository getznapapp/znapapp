# SCHEMA FIX INSTRUCTIONS

## Problem
The error "column photos.cameraId does not exist" indicates that the database schema has a column naming issue. The code expects `cameraId` (camelCase) but the database might have `camera_id` (snake_case) or the table might not exist properly.

## Solution Steps

### Step 1: Run the Schema Fix SQL Script
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the entire content of `SUPABASE_SCHEMA_FIX.sql`
4. Run the script

This will:
- Check the current photos table schema
- Drop and recreate the photos table with correct column names
- Set up proper RLS policies
- Create necessary indexes

### Step 2: Verify the Fix
After running the SQL script, you should see:
- A success message confirming the table was recreated
- The correct schema with `cameraId` column (camelCase)
- Proper RLS policies in place

### Step 3: Test the Application
1. Try taking a photo in the app
2. Check that the photo count updates correctly
3. Verify that photos are being stored and retrieved properly

## What the Fix Does

1. **Drops the existing photos table** (if it exists with wrong schema)
2. **Recreates the photos table** with the correct column names:
   - `id` (TEXT PRIMARY KEY)
   - `cameraId` (TEXT NOT NULL) - This is the key fix
   - `fileName` (TEXT NOT NULL)
   - `publicUrl` (TEXT NOT NULL)
   - `userId` (TEXT NOT NULL DEFAULT 'anonymous')
   - `userName` (TEXT NOT NULL DEFAULT 'Anonymous User')
   - `uploadedAt` (TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW())
   - `mimeType` (TEXT NOT NULL DEFAULT 'image/jpeg')
   - `fileSize` (INTEGER NOT NULL DEFAULT 0)
   - `created_at` (TIMESTAMP WITH TIME ZONE DEFAULT NOW())
   - `updated_at` (TIMESTAMP WITH TIME ZONE DEFAULT NOW())

3. **Creates proper indexes** for performance
4. **Sets up RLS policies** that allow all operations
5. **Grants necessary permissions** to all user roles

## Code Changes Made

The `lib/supabase-direct.ts` file has been updated to handle potential column naming issues more gracefully by trying both camelCase and snake_case column names.

## Expected Results

After applying this fix:
- Photo uploads should work without "column does not exist" errors
- Photo counts should display correctly
- The rear camera should work properly
- Photos should be properly stored and retrieved from the database

## Troubleshooting

If you still see issues after running the fix:

1. **Check the SQL script output** - Look for any error messages in the Supabase SQL editor
2. **Verify table creation** - Run this query to check the schema:
   ```sql
   SELECT column_name, data_type FROM information_schema.columns 
   WHERE table_name = 'photos' ORDER BY ordinal_position;
   ```
3. **Check RLS policies** - Run this query to verify policies:
   ```sql
   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'photos';
   ```

If problems persist, the issue might be related to:
- Network connectivity to Supabase
- Supabase project configuration
- Storage bucket setup

## Important Notes

- This fix will **delete all existing photos** in the database (if any) because it drops and recreates the table
- Make sure to backup any important data before running the fix
- The fix creates permissive RLS policies that allow all operations - this is suitable for development but you may want to tighten security for production