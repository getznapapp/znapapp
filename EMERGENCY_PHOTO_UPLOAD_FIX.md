# EMERGENCY PHOTO UPLOAD FIX

## Problem
Photos are failing to upload with the error: "new row violates row-level security policy"

## Solution
Run these SQL scripts in your Supabase SQL Editor in this exact order:

### Step 1: Fix RLS Policies
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the entire content of `SUPABASE_SIMPLE_RLS_EMERGENCY_FIX.sql`
4. Click "Run" to execute

### Step 2: Fix Storage Policies  
1. In the same SQL Editor
2. Copy and paste the entire content of `SUPABASE_STORAGE_POLICY_FIX.sql`
3. Click "Run" to execute

### Step 3: Verify the Fix
After running both scripts, you should see success messages. Test photo upload in your app.

## What These Scripts Do

### RLS Fix:
- Temporarily disables Row Level Security
- Removes all conflicting policies
- Grants full permissions to all user roles (anon, authenticated, service_role)
- Re-enables RLS with the most permissive policies possible
- Creates simple policies that allow all operations

### Storage Fix:
- Removes restrictive storage bucket policies
- Creates permissive policies for the camera-photos bucket
- Allows all users to upload, view, update, and delete photos

## Expected Results
- Photo uploads should work immediately after running these scripts
- No more "row-level security policy" errors
- Both online and offline photo storage should function properly

## If It Still Doesn't Work
1. Check the Supabase logs for any other error messages
2. Verify your Supabase URL and anon key are correct in your app
3. Make sure the `camera-photos` storage bucket exists
4. Try creating a test photo upload directly in Supabase dashboard

## Security Note
These policies are very permissive and allow all operations. In a production app, you may want to implement more restrictive policies later, but this will get photo uploads working immediately.