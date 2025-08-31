# Photo Upload RLS Fix Instructions

## Problem
The app is showing these errors:
- `ERROR Direct upload error: {"error": "Unauthorized", "message": "new row violates row-level security policy", "statusCode": "403"}`
- `ERROR Direct photo upload failed: [Error: Failed to upload image: new row violates row-level security policy]`

## Solution
The issue is with Row Level Security (RLS) policies in Supabase that are blocking photo uploads.

## Steps to Fix

### 1. Open Supabase Dashboard
- Go to your Supabase project dashboard
- Navigate to the SQL Editor

### 2. Run the Fix Script
- Copy the entire contents of `SUPABASE_FINAL_RLS_PHOTO_FIX.sql`
- Paste it into the SQL Editor
- Click "Run" to execute the script

### 3. Verify the Fix
The script will show verification results including:
- RLS status for both tables
- Active policies
- Table access tests
- Success message

### 4. Test Photo Upload
- Go back to your app
- Try taking a photo
- The upload should now work without RLS errors

## What the Fix Does

1. **Temporarily disables RLS** to clean up existing policies
2. **Removes all conflicting policies** that might be blocking uploads
3. **Grants comprehensive permissions** to all user roles (anon, authenticated, service_role)
4. **Re-enables RLS** with proper configuration
5. **Creates permissive policies** that allow all operations for all users
6. **Verifies the fix** with test queries

## Expected Result
After running this script, photo uploads should work without any "row-level security policy" errors.

## If Issues Persist
If you still get RLS errors after running this script:

1. Check that the script ran without errors
2. Verify that both `photos` and `cameras` tables exist
3. Make sure the storage bucket `camera-photos` exists and is public
4. Try restarting your app to clear any cached connection issues

## Storage Bucket Setup
If you haven't set up the storage bucket yet:

1. Go to Storage in your Supabase dashboard
2. Create a new bucket named `camera-photos`
3. Make it public
4. Set file size limit to 50MB
5. Allow image/* MIME types