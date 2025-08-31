-- SIMPLE RLS FIX - Run this in Supabase SQL Editor
-- This completely disables RLS and grants all permissions

-- Disable RLS on both tables
ALTER TABLE photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE cameras DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies (ignore errors)
DROP POLICY IF EXISTS "photos_select_policy" ON photos;
DROP POLICY IF EXISTS "photos_insert_policy" ON photos;
DROP POLICY IF EXISTS "photos_update_policy" ON photos;
DROP POLICY IF EXISTS "photos_delete_policy" ON photos;
DROP POLICY IF EXISTS "photos_ultimate_access" ON photos;

DROP POLICY IF EXISTS "cameras_select_policy" ON cameras;
DROP POLICY IF EXISTS "cameras_insert_policy" ON cameras;
DROP POLICY IF EXISTS "cameras_update_policy" ON cameras;
DROP POLICY IF EXISTS "cameras_delete_policy" ON cameras;
DROP POLICY IF EXISTS "cameras_ultimate_access" ON cameras;

-- Grant full permissions to all roles
GRANT ALL ON photos TO anon;
GRANT ALL ON photos TO authenticated;
GRANT ALL ON photos TO service_role;

GRANT ALL ON cameras TO anon;
GRANT ALL ON cameras TO authenticated;
GRANT ALL ON cameras TO service_role;

-- Verify RLS is disabled
SELECT 
    tablename,
    CASE WHEN rowsecurity THEN 'ENABLED (BAD)' ELSE 'DISABLED (GOOD)' END as rls_status
FROM pg_tables 
WHERE tablename IN ('photos', 'cameras');