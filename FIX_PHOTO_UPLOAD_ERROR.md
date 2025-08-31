# Fix Photo Upload Error - "new row violates row-level security policy"

## Problem
You're getting this error when trying to upload photos:
```
ERROR Direct upload error: {"error": "Unauthorized", "message": "new row violates row-level security policy", "statusCode": "403"}
```

## Solution
The issue is with Supabase Row Level Security (RLS) policies that are blocking anonymous photo uploads.

### Step 1: Run the RLS Fix Script
1. Open your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the entire contents of `SUPABASE_RLS_SIMPLE_FIX.sql`
4. Click "Run" to execute the script

### Step 2: Verify the Fix
After running the script, you should see output like:
- "Cameras table is accessible"
- "Photos table is accessible" 
- "RLS fix completed successfully!"

### What the Script Does
1. **Disables RLS temporarily** to clean up existing restrictive policies
2. **Drops all existing policies** that might be blocking uploads
3. **Creates new permissive policies** that allow both anonymous and authenticated users to:
   - Insert photos and cameras
   - Read photos and cameras
   - Update photos and cameras
   - Delete photos and cameras
4. **Grants necessary permissions** to both `anon` and `authenticated` roles
5. **Grants sequence permissions** needed for auto-incrementing IDs
6. **Verifies the setup** works correctly

### After Running the Script
- Photo uploads should work immediately
- Both anonymous and authenticated users can upload photos
- Camera creation should also work without issues
- The app will continue to work in offline mode as a fallback

### Security Note
This script creates very permissive policies for development/testing. In production, you may want to implement more restrictive policies based on your specific security requirements.

### If You Still Have Issues
1. Check that the script ran without errors
2. Verify your Supabase URL and API key are correct in `lib/supabase.ts`
3. Make sure the `camera-photos` storage bucket exists in your Supabase dashboard
4. Check the browser console for any additional error messages