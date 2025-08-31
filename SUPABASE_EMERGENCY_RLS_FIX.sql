-- EMERGENCY RLS FIX - Copy and paste this ENTIRE script into Supabase SQL Editor
-- This will completely disable RLS and allow all operations

-- 1. Disable RLS on both tables
ALTER TABLE photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE cameras DISABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies (these commands will not fail if policies don't exist)
DO $$ 
BEGIN
    -- Drop photos policies
    DROP POLICY IF EXISTS "photos_select_policy" ON photos;
    DROP POLICY IF EXISTS "photos_insert_policy" ON photos;
    DROP POLICY IF EXISTS "photos_update_policy" ON photos;
    DROP POLICY IF EXISTS "photos_delete_policy" ON photos;
    DROP POLICY IF EXISTS "photos_ultimate_access" ON photos;
    
    -- Drop cameras policies
    DROP POLICY IF EXISTS "cameras_select_policy" ON cameras;
    DROP POLICY IF EXISTS "cameras_insert_policy" ON cameras;
    DROP POLICY IF EXISTS "cameras_update_policy" ON cameras;
    DROP POLICY IF EXISTS "cameras_delete_policy" ON cameras;
    DROP POLICY IF EXISTS "cameras_ultimate_access" ON cameras;
    
    RAISE NOTICE 'All policies dropped successfully';
END $$;

-- 3. Grant full permissions to all roles
GRANT ALL PRIVILEGES ON photos TO anon;
GRANT ALL PRIVILEGES ON photos TO authenticated;
GRANT ALL PRIVILEGES ON photos TO service_role;

GRANT ALL PRIVILEGES ON cameras TO anon;
GRANT ALL PRIVILEGES ON cameras TO authenticated;
GRANT ALL PRIVILEGES ON cameras TO service_role;

-- 4. Grant sequence permissions (for auto-incrementing IDs if any)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 5. Verify RLS is disabled
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN 'RLS ENABLED (PROBLEM!)' 
        ELSE 'RLS DISABLED (GOOD)' 
    END as status
FROM pg_tables 
WHERE tablename IN ('photos', 'cameras')
ORDER BY tablename;

-- 6. Show success message
SELECT 'SUCCESS: RLS has been completely disabled!' as message;