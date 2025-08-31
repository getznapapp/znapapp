# URGENT: Database Schema and Image Upload Fixes

## Issues Fixed

1. **Database Column Naming Issue**: The error "column photos.cameraId does not exist" 
2. **Image Upload MIME Type Issue**: The error "mime type application/json is not supported"

## Steps to Fix

### 1. Fix Database Schema

**IMPORTANT**: Run the SQL script `SUPABASE_SCHEMA_FIX.sql` in your Supabase SQL Editor:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the entire content of `SUPABASE_SCHEMA_FIX.sql`
4. Click "Run" to execute the script

This script will:
- Check if the photos table has the correct `cameraId` column (camelCase)
- Rename `camera_id` to `cameraId` if needed
- Add missing columns if they don't exist
- Create the cameras table if it doesn't exist
- Set up proper RLS policies and permissions
- Add foreign key constraints

### 2. Code Changes Made

The following files have been updated to fix the issues:

#### `lib/supabase-direct.ts`
- Fixed database query to use `cameraId` (camelCase) consistently
- Added better error handling for base64 conversion
- Added more detailed logging for debugging
- Improved image buffer creation with proper error handling

#### `lib/image-upload.ts`
- Enhanced base64 conversion for both web and mobile platforms
- Added comprehensive error handling and validation
- Added detailed logging for debugging image processing
- Fixed potential issues with empty or invalid base64 data

### 3. What These Fixes Address

#### Database Issues:
- ✅ "column photos.cameraId does not exist" - Fixed by ensuring correct column naming
- ✅ Photo count not updating - Fixed by proper database schema
- ✅ Photos not being retrieved - Fixed by correct column references

#### Image Upload Issues:
- ✅ "mime type application/json is not supported" - Fixed by proper base64 handling
- ✅ Image data being sent as JSON instead of binary - Fixed by improved conversion
- ✅ Empty or invalid base64 data - Fixed by validation and error handling

### 4. Testing

After running the SQL script, test the following:

1. **Create a new camera** - Should work without errors
2. **Take photos** - Should upload successfully and show correct count
3. **View photos** - Should display properly in the gallery
4. **QR code sharing** - Should work with proper photo counts

### 5. Verification

Check the console logs for these success messages:
- "Image processing completed" - Confirms proper base64 conversion
- "Direct upload successful" - Confirms Supabase storage upload works
- "Photo metadata saved successfully" - Confirms database insertion works
- "Direct photos query result" - Confirms photo retrieval works

## If Issues Persist

If you still see errors after running the SQL script:

1. Check the Supabase logs in your dashboard
2. Verify the storage bucket "camera-photos" exists and is public
3. Ensure RLS policies are properly set up
4. Check that both `anon` and `authenticated` roles have proper permissions

The fixes should resolve all the reported issues with photo uploads, counts, and database operations.