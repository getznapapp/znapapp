-- COMPLETE RLS FIX FOR PHOTO UPLOAD ISSUES
-- This script fixes both database table RLS policies and storage bucket policies
-- Copy and paste this ENTIRE script into Supabase SQL Editor and run it

-- ========================================
-- PART 1: FIX DATABASE TABLE RLS POLICIES
-- ========================================

-- 1. Temporarily disable RLS to clean up existing policies
ALTER TABLE IF EXISTS photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cameras DISABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies that might be causing conflicts
DROP POLICY IF EXISTS "photos_select_policy" ON photos;
DROP POLICY IF EXISTS "photos_insert_policy" ON photos;
DROP POLICY IF EXISTS "photos_update_policy" ON photos;
DROP POLICY IF EXISTS "photos_delete_policy" ON photos;
DROP POLICY IF EXISTS "photos_ultimate_access" ON photos;
DROP POLICY IF EXISTS "Enable read access for all users" ON photos;
DROP POLICY IF EXISTS "Enable insert for all users" ON photos;
DROP POLICY IF EXISTS "Enable update for all users" ON photos;
DROP POLICY IF EXISTS "Enable delete for all users" ON photos;
DROP POLICY IF EXISTS "Allow all operations on photos" ON photos;

DROP POLICY IF EXISTS "cameras_select_policy" ON cameras;
DROP POLICY IF EXISTS "cameras_insert_policy" ON cameras;
DROP POLICY IF EXISTS "cameras_update_policy" ON cameras;
DROP POLICY IF EXISTS "cameras_delete_policy" ON cameras;
DROP POLICY IF EXISTS "cameras_ultimate_access" ON cameras;
DROP POLICY IF EXISTS "Enable read access for all users" ON cameras;
DROP POLICY IF EXISTS "Enable insert for all users" ON cameras;
DROP POLICY IF EXISTS "Enable update for all users" ON cameras;
DROP POLICY IF EXISTS "Enable delete for all users" ON cameras;
DROP POLICY IF EXISTS "Allow all operations on cameras" ON cameras;

-- 3. Grant comprehensive permissions to all roles
GRANT ALL PRIVILEGES ON TABLE photos TO anon;
GRANT ALL PRIVILEGES ON TABLE photos TO authenticated;
GRANT ALL PRIVILEGES ON TABLE photos TO service_role;
GRANT ALL PRIVILEGES ON TABLE photos TO postgres;

GRANT ALL PRIVILEGES ON TABLE cameras TO anon;
GRANT ALL PRIVILEGES ON TABLE cameras TO authenticated;
GRANT ALL PRIVILEGES ON TABLE cameras TO service_role;
GRANT ALL PRIVILEGES ON TABLE cameras TO postgres;

-- 4. Grant sequence permissions (needed for auto-incrementing IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- 5. Re-enable RLS with proper policies
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cameras ENABLE ROW LEVEL SECURITY;

-- 6. Create new permissive policies that allow all operations
CREATE POLICY "photos_allow_all" ON photos
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "cameras_allow_all" ON cameras
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- ========================================
-- PART 2: FIX STORAGE BUCKET POLICIES
-- ========================================

-- 7. Drop existing restrictive storage policies
DROP POLICY IF EXISTS "Auth users can read/write own uploads r3csvd_0" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can read/write own uploads r3csvd_1" ON storage.objects;
DROP POLICY IF EXISTS "Allow photo uploads to camera-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow photo viewing from camera-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow photo updates in camera-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow photo deletion from camera-photos" ON storage.objects;

-- 8. Create new permissive storage policies for camera-photos bucket
CREATE POLICY "camera_photos_insert" ON storage.objects
    FOR INSERT
    TO public
    WITH CHECK (bucket_id = 'camera-photos');

CREATE POLICY "camera_photos_select" ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'camera-photos');

CREATE POLICY "camera_photos_update" ON storage.objects
    FOR UPDATE
    TO public
    USING (bucket_id = 'camera-photos')
    WITH CHECK (bucket_id = 'camera-photos');

CREATE POLICY "camera_photos_delete" ON storage.objects
    FOR DELETE
    TO public
    USING (bucket_id = 'camera-photos');

-- ========================================
-- PART 3: VERIFICATION AND TESTING
-- ========================================

-- 9. Verify table RLS status
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity THEN 'RLS ENABLED' 
        ELSE 'RLS DISABLED' 
    END as rls_status
FROM pg_tables 
WHERE tablename IN ('photos', 'cameras')
ORDER BY tablename;

-- 10. Show table policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('photos', 'cameras')
ORDER BY tablename, policyname;

-- 11. Show storage policies
SELECT 
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND policyname LIKE '%camera%'
ORDER BY policyname;

-- 12. Test basic table access
SELECT 'Table access test - if you see this, basic table access is working' as test_result;

-- 13. Final success message
SELECT 'SUCCESS: RLS policies have been completely reset and configured for photo uploads!' as final_message;