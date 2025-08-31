# Complete RLS Fix Instructions

## Problem
You're getting these errors when trying to upload photos:
- `ERROR Direct upload error: {"error": "Unauthorized", "message": "new row violates row-level security policy", "statusCode": "403"}`
- `ERROR Direct photo upload failed: [Error: Failed to upload image: new row violates row-level security policy]`

## Root Cause
The issue is with Supabase Row Level Security (RLS) policies that are blocking photo uploads to both the database tables and storage bucket.

## Solution

### Step 1: Run the Complete RLS Fix Script

1. **Open your Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Paste the Fix Script**
   - Open the file `SUPABASE_COMPLETE_RLS_FIX.sql` in your project
   - Copy the ENTIRE contents
   - Paste it into the SQL Editor

4. **Run the Script**
   - Click "Run" button
   - Wait for it to complete
   - You should see success messages at the end

### Step 2: Verify the Fix

1. **Test in the App**
   - Navigate to `/test-rls-complete-fix` in your app
   - Click "Run Complete Test"
   - The test should pass with green checkmarks

2. **Try Taking a Photo**
   - Go back to your camera functionality
   - Try taking a photo
   - It should upload successfully without RLS errors

### Step 3: What the Fix Does

The script performs these actions:

#### Database Table Fixes:
- Disables RLS temporarily to clean up conflicting policies
- Drops all existing restrictive policies
- Grants comprehensive permissions to all user roles (anon, authenticated, service_role)
- Re-enables RLS with permissive policies that allow all operations
- Creates new policies that allow all users to read/write photos and cameras

#### Storage Bucket Fixes:
- Drops existing restrictive storage policies
- Creates new permissive policies for the `camera-photos` bucket
- Allows all users to upload, view, update, and delete photos in the bucket

#### Verification:
- Shows the current RLS status
- Lists all active policies
- Provides test queries to verify everything is working

### Step 4: Alternative Manual Fix (if script fails)

If the automated script doesn't work, you can manually run these commands:

1. **Disable RLS on tables:**
   ```sql
   ALTER TABLE photos DISABLE ROW LEVEL SECURITY;
   ALTER TABLE cameras DISABLE ROW LEVEL SECURITY;
   ```

2. **Grant permissions:**
   ```sql
   GRANT ALL PRIVILEGES ON TABLE photos TO anon;
   GRANT ALL PRIVILEGES ON TABLE photos TO authenticated;
   GRANT ALL PRIVILEGES ON TABLE cameras TO anon;
   GRANT ALL PRIVILEGES ON TABLE cameras TO authenticated;
   ```

3. **Re-enable RLS with permissive policies:**
   ```sql
   ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
   ALTER TABLE cameras ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "photos_allow_all" ON photos FOR ALL TO public USING (true) WITH CHECK (true);
   CREATE POLICY "cameras_allow_all" ON cameras FOR ALL TO public USING (true) WITH CHECK (true);
   ```

4. **Fix storage policies:**
   ```sql
   CREATE POLICY "camera_photos_insert" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'camera-photos');
   CREATE POLICY "camera_photos_select" ON storage.objects FOR SELECT TO public USING (bucket_id = 'camera-photos');
   ```

### Step 5: Troubleshooting

#### If you still get RLS errors:
1. Check that the `camera-photos` storage bucket exists
2. Verify that RLS is enabled on the tables but with permissive policies
3. Make sure the policies were created correctly

#### If you get "Bucket not found" errors:
1. Go to Supabase Dashboard → Storage
2. Create a new bucket called `camera-photos`
3. Make it public
4. Run the storage policy part of the script again

#### If you get "relation does not exist" errors:
1. Make sure your `photos` and `cameras` tables exist
2. Check the table structure matches what the app expects
3. Run the table creation scripts if needed

### Step 6: Security Considerations

**Important:** This fix makes your tables and storage bucket publicly accessible. This is appropriate for a disposable camera app where:
- Photos are meant to be shared among participants
- No sensitive personal data is stored
- The app is designed for temporary, collaborative photo sharing

If you need more restrictive access in the future, you can implement proper authentication and create more specific RLS policies.

### Step 7: Verification Commands

After running the fix, you can verify it worked by running these queries in SQL Editor:

```sql
-- Check RLS status
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('photos', 'cameras');

-- Check policies
SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('photos', 'cameras');

-- Test basic access
SELECT COUNT(*) FROM photos;
SELECT COUNT(*) FROM cameras;
```

## Success Indicators

✅ **The fix worked if:**
- No more "row-level security policy" errors
- Photos upload successfully
- The test app shows green checkmarks
- You can see photos in the gallery

❌ **The fix didn't work if:**
- Still getting RLS errors
- Photos fail to upload
- Test app shows red X marks

If the fix doesn't work, please share the exact error messages you're getting and we can troubleshoot further.